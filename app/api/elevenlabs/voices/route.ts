import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  await requireAuth();

  const settings = await prisma.appSettings.findFirst();
  if (!settings?.elevenLabsApiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not set.' }, { status: 400 });
  }

  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': settings.elevenLabsApiKey }
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `ElevenLabs error ${res.status}: ${err}` }, { status: res.status });
  }

  const data = await res.json();
  const voices = (data.voices ?? []).map((v: { voice_id: string; name: string; category?: string }) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category ?? 'generated'
  }));

  return NextResponse.json({ voices });
}
