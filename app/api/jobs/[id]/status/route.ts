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
  const listPath = outputPath + '.txt';
  const listContent = clipPaths.map(p => `file '${p}'`).join('\n');
  await writeFile(listPath, listContent);

  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`,
    { timeout: 120000 }
  );

  await Promise.allSettled([
    unlink(listPath),
    ...clipPaths.map(p => unlink(p))
  ]);
}

async function ffmpegMergeAudio(videoPath: string, audioPath: string, outputPath: string) {
  // Mux voiceover into video; -shortest stops at whichever stream ends first
  await execAsync(
    `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`,
    { timeout: 120000 }
  );
  await unlink(videoPath); // remove the silent video
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
      const hedraKey = (settings as typeof settings & { hedraApiKey?: string }).hedraApiKey || settings.videoApiKey || '';
      pollResult = await pollHedra(job.providerRef, hedraKey);
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

    // ── Succeeded — download + concat + merge audio ──────────────────────────
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const ts = Date.now();
    const finalFilename = `video-${job.productId}-${ts}.mp4`;
    const finalPath = join(uploadsDir, finalFilename);
    const localUrl = `/uploads/${finalFilename}`;

    try {
      const remoteUrls = pollResult.videoUrls ?? (pollResult.videoUrl ? [pollResult.videoUrl] : []);

      // Step 1: download clips + concat (or single download) → silent video
      const silentPath = join(uploadsDir, `silent-${job.productId}-${ts}.mp4`);

      if (remoteUrls.length > 1) {
        const clipPaths = await Promise.all(
          remoteUrls.map(async (url, i) => {
            const clipPath = join(uploadsDir, `clip-${job.productId}-${ts}-${i}.mp4`);
            await downloadFile(url, clipPath);
            return clipPath;
          })
        );
        await ffmpegConcat(clipPaths, silentPath);
      } else if (remoteUrls.length === 1) {
        await downloadFile(remoteUrls[0], silentPath);
      } else {
        throw new Error('No video URLs returned from provider');
      }

      // Step 2: merge voiceover if available
      const voiceAsset = await prisma.asset.findFirst({
        where: { productId: job.productId, type: 'VOICEOVER' },
        orderBy: { createdAt: 'desc' }
      });

      if (voiceAsset?.path) {
        await ffmpegMergeAudio(silentPath, voiceAsset.path, finalPath);
      } else {
        // No voiceover — just rename silent video to final
        const { rename } = await import('fs/promises');
        await rename(silentPath, finalPath);
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
