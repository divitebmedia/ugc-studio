import type { AppSettings, Product } from '@prisma/client';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function generateUGCImage(product: Product, settings: AppSettings, script: string) {
  if (!settings.textApiKey) {
    throw new Error('Gemini API key not set. Go to Settings and add your Google AI API key.');
  }

  const prompt = `Photorealistic UGC creator content photo, vertical 9:16 format, shot on iPhone selfie camera.

A real-looking young adult (casual clothes, natural lighting, home or everyday background) holding and showing ${product.name}. ${product.description}.

Style: authentic user-generated content, slight motion blur, candid feel, not studio. The person looks genuinely excited. Product is clearly visible and in focus. Natural skin tones, real environment, NOT a professional photoshoot. Shot like a TikTok creator filming themselves.

Target: ${product.targetAudience}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${settings.textApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '9:16',
          personGeneration: 'allow_adult',
          safetyFilterLevel: 'block_only_high'
        }
      })
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Imagen API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const prediction = data.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    throw new Error('Imagen returned no image data.');
  }

  const buffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
  const filename = `ugc-${product.id}-${Date.now()}.png`;
  const filePath = join(process.cwd(), 'public', 'uploads', filename);
  await writeFile(filePath, buffer);

  return {
    provider: 'imagen3',
    model: 'imagen-4.0-generate-001',
    filename,
    mimeType: 'image/png',
    path: filePath,
    url: `/uploads/${filename}`,
    prompt
  };
}
