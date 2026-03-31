import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { generateUGCImage } from '@/lib/providers/image';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const user = await ensureAdminUser();
  const { id } = await params;

  const [product, settings, latestScript] = await Promise.all([
    prisma.product.findFirst({ where: { id, userId: user.id } }),
    prisma.appSettings.findUnique({ where: { userId: user.id } }),
    prisma.job.findFirst({ where: { productId: id, userId: user.id, type: 'SCRIPT', status: 'SUCCEEDED' }, orderBy: { createdAt: 'desc' } })
  ]);

  if (!product || !settings) redirect('/products');

  let imageResult: Awaited<ReturnType<typeof generateUGCImage>> | null = null;
  let status: 'SUCCEEDED' | 'FAILED' = 'SUCCEEDED';
  let errorMsg = '';

  try {
    imageResult = await generateUGCImage(product, settings, latestScript?.output || '');
  } catch (err) {
    status = 'FAILED';
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  if (imageResult) {
    await prisma.asset.create({
      data: {
        productId: product.id,
        type: 'GENERATED_IMAGE',
        filename: imageResult.filename,
        mimeType: imageResult.mimeType,
        path: imageResult.path,
        url: imageResult.url,
        prompt: imageResult.prompt,
        providerRef: `${imageResult.provider}:${imageResult.model}`
      }
    });
  }

  await prisma.job.create({
    data: {
      userId: user.id,
      productId: product.id,
      type: 'IMAGE',
      status,
      title: `UGC image for ${product.name}`,
      prompt: imageResult?.prompt || null,
      output: imageResult?.url || null,
      provider: 'imagen3',
      model: 'imagen-3.0-generate-002',
      error: errorMsg || null
    }
  });

  redirect(`/products/${product.id}`);
}
