import { redirect } from 'next/navigation';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { submitVideoJob } from '@/lib/providers/video';

async function localUrlToBase64(url: string): Promise<string> {
  // url is like /uploads/filename.png — read from disk, skip HTTP entirely
  const rel = url.startsWith('/') ? url.slice(1) : url;
  const filePath = join(process.cwd(), 'public', rel);
  const buf = await readFile(filePath);
  const ext = rel.split('.').pop()?.toLowerCase() ?? 'png';
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const user = await ensureAdminUser();
  const { id } = await params;
  const origin = new URL(request.url).origin;

  const [product, settings, latestScript] = await Promise.all([
    prisma.product.findFirst({ where: { id, userId: user.id }, include: { assets: { orderBy: { createdAt: 'desc' } } } }),
    prisma.appSettings.findUnique({ where: { userId: user.id } }),
    prisma.job.findFirst({ where: { productId: id, userId: user.id, type: 'SCRIPT', status: 'SUCCEEDED' }, orderBy: { createdAt: 'desc' } })
  ]);

  if (!product || !settings) redirect('/products');

  const ugcImage = product.assets.find((a) => a.type === 'GENERATED_IMAGE');
  const voiceAsset = product.assets.find((a) => a.type === 'VOICEOVER');
  const script = latestScript?.output || '';

  let taskId = '';
  let status: 'PENDING' | 'FAILED' = 'PENDING';
  let errorMsg = '';

  try {
    const toAbsolute = (url?: string | null) =>
      url ? (url.startsWith('http') ? url : `${origin}${url}`) : undefined;

    const imageBase64 = ugcImage?.url ? await localUrlToBase64(ugcImage.url) : '';

    const result = await submitVideoJob(product, settings, {
      script,
      imageUrl: imageBase64,
      audioUrl: toAbsolute(voiceAsset?.url)
    });
    taskId = result.taskId;
  } catch (err) {
    status = 'FAILED';
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  await prisma.job.create({
    data: {
      userId: user.id,
      productId: product.id,
      type: 'VIDEO',
      status,
      title: `Video for ${product.name}`,
      prompt: script || null,
      provider: settings.videoProvider,
      model: settings.videoModel,
      providerRef: taskId || null,
      error: errorMsg || null
    }
  });

  redirect(`/products/${product.id}`);
}
