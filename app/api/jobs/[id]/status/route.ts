import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { pollKling, pollRunway, pollHedra } from '@/lib/providers/video';
import { writeFile } from 'fs/promises';
import { join } from 'path';

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

    let pollResult: { status: string; videoUrl?: string };

    if (job.provider === 'kling') {
      pollResult = await pollKling(job.providerRef, settings.videoApiKey);
    } else if (job.provider === 'runway') {
      pollResult = await pollRunway(job.providerRef, settings.videoApiKey);
    } else if (job.provider === 'hedra') {
      pollResult = await pollHedra(job.providerRef, settings.videoApiKey);
    } else {
      return NextResponse.json({ status: 'PENDING', message: 'Unknown provider' });
    }

    if (pollResult.status === 'SUCCEEDED' && pollResult.videoUrl) {
      // Download and save the video locally
      let localUrl = pollResult.videoUrl;
      try {
        const videoRes = await fetch(pollResult.videoUrl);
        if (videoRes.ok) {
          const buffer = Buffer.from(await videoRes.arrayBuffer());
          const filename = `video-${job.productId}-${Date.now()}.mp4`;
          await writeFile(join(process.cwd(), 'public', 'uploads', filename), buffer);
          localUrl = `/uploads/${filename}`;

          await prisma.asset.create({
            data: {
              productId: job.productId,
              type: 'GENERATED_VIDEO',
              filename,
              mimeType: 'video/mp4',
              path: join(process.cwd(), 'public', 'uploads', filename),
              url: localUrl,
              providerRef: job.providerRef
            }
          });
        }
      } catch {
        // If download fails, still mark succeeded with remote URL
        localUrl = pollResult.videoUrl;
      }

      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'SUCCEEDED', output: localUrl }
      });

      return NextResponse.json({ status: 'SUCCEEDED', output: localUrl });
    }

    if (pollResult.status === 'FAILED') {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED', error: 'Provider reported failure' } });
      return NextResponse.json({ status: 'FAILED' });
    }

    return NextResponse.json({ status: 'PENDING' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
