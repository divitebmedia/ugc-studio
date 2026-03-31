import { prisma } from '@/lib/prisma';

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, role: 'ADMIN' }
  });

  await prisma.appSettings.upsert({
    where: { userId: user.id },
    update: { adminEmail: email },
    create: {
      userId: user.id,
      adminEmail: email,
      brandVoice: 'Casual, direct, conversion-focused',
      defaultCta: 'Shop now — link in bio',
      textProvider: 'gemini',
      textApiKey: '',
      textModel: 'gemini-2.0-flash',
      imageProvider: 'imagen3',
      imageApiKey: '',
      imageModel: 'imagen-3.0-generate-002',
      videoProvider: 'kling',
      videoApiKey: '',
      videoModel: 'kling-v1-6',
      elevenLabsApiKey: '',
      voiceId: '21m00Tcm4TlvDq8ikWAM'
    }
  });

  return user;
}
