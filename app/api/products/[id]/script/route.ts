import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { generateAdScript } from '@/lib/providers/text';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const user = await ensureAdminUser();
  const { id } = await params;

  const [product, settings] = await Promise.all([
    prisma.product.findFirst({ where: { id, userId: user.id } }),
    prisma.appSettings.findUnique({ where: { userId: user.id } })
  ]);

  if (!product || !settings) redirect('/products');

  let script = '';
  let status: 'SUCCEEDED' | 'FAILED' = 'SUCCEEDED';
  let errorMsg = '';

  try {
    const result = await generateAdScript(product, settings);
    script = result.script;
  } catch (err) {
    status = 'FAILED';
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  await prisma.job.create({
    data: {
      userId: user.id,
      productId: product.id,
      type: 'SCRIPT',
      status,
      title: `Script for ${product.name}`,
      prompt: product.description,
      output: script || null,
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      error: errorMsg || null
    }
  });

  redirect(`/products/${product.id}`);
}
