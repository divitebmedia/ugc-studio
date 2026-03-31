import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { pollKling, pollRunway, pollHedra } from '@/lib/providers/video';

const execAsync = promisify(exec);

async function downloadFile(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function ffmpegConcat(clipPaths: string[], outputPath: string) {
  // Build a concat list file
  const listPath = outputPath + '.txt';
  const listContent = clipPaths.map(p => `file '${p}'`).join('\n');
  await writeFile(listPath, listContent);

  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`,
    { timeout: 120000 }
  );

  // Clean up temp files
  await Promise.allSettled([
    unlink(listPath),
    ...clipPaths.map(p => unlink(p))
  ]);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const user = await ensureAdminUser();
    const { id } = await params;

    const [job, settings] = await Promise.all([
      prisma.job.findFirst({ where: { id, userId: user.id, type: 'VIDEO' } }),
      prisma.appSettings.findUnique({ where: { userId: user.id } })
    ]);

    if (!job || !settings) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'PENDING') {
      return NextResponse.json({ status: job.status, output: job.output });
    }

    if (!job.providerRef) {
      return NextResponse.json({ status: 'PENDING', message: 'No task ID yet' });
    }

    // ── Poll the provider ────────────────────────────────────────────────────
    let pollResult: { status: string; videoUrl?: string; videoUrls?: string[] };

    if (job.provider === 'kling') {
      pollResult = await pollKling(job.providerRef, settings.videoApiKey);
    } else if (job.provider === 'runway') {
      pollResult = await pollRunway(job.providerRef, settings.videoApiKey);
    } else if (job.provider === 'hedra') {
      pollResult = await pollHedra(job.providerRef, settings.videoApiKey);
    } else {
      return NextResponse.json({ status: 'PENDING', message: 'Unknown provider' });
    }

    // ── Still running ────────────────────────────────────────────────────────
    if (pollResult.status === 'PENDING') {
      return NextResponse.json({ status: 'PENDING' });
    }

    // ── Failed ───────────────────────────────────────────────────────────────
    if (pollResult.status === 'FAILED') {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED', error: 'Provider reported failure' } });
      return NextResponse.json({ status: 'FAILED' });
    }

    // ── Succeeded — download + optional FFmpeg concat ────────────────────────
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const finalFilename = `video-${job.productId}-${Date.now()}.mp4`;
    const finalPath = join(uploadsDir, finalFilename);
    const localUrl = `/uploads/${finalFilename}`;

    try {
      const remoteUrls = pollResult.videoUrls ?? (pollResult.videoUrl ? [pollResult.videoUrl] : []);

      if (remoteUrls.length > 1) {
        // Download all clips then FFmpeg concat
        const clipPaths = await Promise.all(
          remoteUrls.map(async (url, i) => {
            const clipPath = join(uploadsDir, `clip-${job.productId}-${Date.now()}-${i}.mp4`);
            await downloadFile(url, clipPath);
            return clipPath;
          })
        );
        await ffmpegConcat(clipPaths, finalPath);
      } else if (remoteUrls.length === 1) {
        await downloadFile(remoteUrls[0], finalPath);
      } else {
        throw new Error('No video URLs returned from provider');
      }

      await prisma.asset.create({
        data: {
          productId: job.productId,
          type: 'GENERATED_VIDEO',
          filename: finalFilename,
          mimeType: 'video/mp4',
          path: finalPath,
          url: localUrl,
          providerRef: job.providerRef
        }
      });
    } catch (downloadErr) {
      // If download/concat fails, still surface remote URL
      const fallback = pollResult.videoUrls?.[0] ?? pollResult.videoUrl ?? '';
      await prisma.job.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', output: fallback } });
      return NextResponse.json({ status: 'SUCCEEDED', output: fallback });
    }

    await prisma.job.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', output: localUrl } });
    return NextResponse.json({ status: 'SUCCEEDED', output: localUrl });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
