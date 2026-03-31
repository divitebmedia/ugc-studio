import type { AppSettings, Product } from '@prisma/client';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function generateVoiceover(product: Product, settings: AppSettings, script: string) {
  if (!settings.elevenLabsApiKey) {
    throw new Error('ElevenLabs API key not set. Go to Settings and add your ElevenLabs API key.');
  }

  const voiceId = settings.voiceId || '21m00Tcm4TlvDq8ikWAM';

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': settings.elevenLabsApiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.80,
          style: 0.3,
          use_speaker_boost: true
        }
      })
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs API error ${res.status}: ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = `voice-${product.id}-${Date.now()}.mp3`;
  const filePath = join(process.cwd(), 'public', 'uploads', filename);
  await writeFile(filePath, buffer);

  return {
    provider: 'elevenlabs',
    model: 'eleven_multilingual_v2',
    voiceId,
    filename,
    mimeType: 'audio/mpeg',
    path: filePath,
    url: `/uploads/${filename}`
  };
}
