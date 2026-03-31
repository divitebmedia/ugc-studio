import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  await requireAuth();
  const user = await ensureAdminUser();
  const form = await request.formData();

  const data = {
    brandVoice: String(form.get('brandVoice') || ''),
    defaultCta: String(form.get('defaultCta') || ''),
    textApiKey: String(form.get('textApiKey') || ''),
    elevenLabsApiKey: String(form.get('elevenLabsApiKey') || ''),
    voiceId: String(form.get('voiceId') || '21m00Tcm4TlvDq8ikWAM'),
    videoProvider: String(form.get('videoProvider') || 'kling'),
    videoApiKey: String(form.get('videoApiKey') || ''),
    videoModel: String(form.get('videoModel') || '')
  };

  await prisma.appSettings.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, adminEmail: user.email, ...data }
  });

  redirect('/settings');
}
