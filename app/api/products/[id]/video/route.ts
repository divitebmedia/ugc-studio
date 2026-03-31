import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { submitVideoJob } from '@/lib/providers/video';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const user = await ensureAdminUser();
  const { id } = await params;

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
    const result = await submitVideoJob(product, settings, {
      script,
      imageUrl: ugcImage?.url || '',
      audioUrl: voiceAsset?.url
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
