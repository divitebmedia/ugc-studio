import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { generateVoiceover } from '@/lib/providers/voice';

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

  const script = latestScript?.output;
  if (!script) redirect(`/products/${product.id}`);

  let voiceResult: Awaited<ReturnType<typeof generateVoiceover>> | null = null;
  let status: 'SUCCEEDED' | 'FAILED' = 'SUCCEEDED';
  let errorMsg = '';

  try {
    voiceResult = await generateVoiceover(product, settings, script!);
  } catch (err) {
    status = 'FAILED';
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  if (voiceResult) {
    await prisma.asset.create({
      data: {
        productId: product.id,
        type: 'VOICEOVER',
        filename: voiceResult.filename,
        mimeType: voiceResult.mimeType,
        path: voiceResult.path,
        url: voiceResult.url,
        providerRef: `elevenlabs:${voiceResult.voiceId}`
      }
    });
  }

  await prisma.job.create({
    data: {
      userId: user.id,
      productId: product.id,
      type: 'VOICEOVER',
      status,
      title: `Voiceover for ${product.name}`,
      prompt: script || null,
      output: voiceResult?.url || null,
      provider: 'elevenlabs',
      model: 'eleven_multilingual_v2',
      error: errorMsg || null
    }
  });

  redirect(`/products/${product.id}`);
}
