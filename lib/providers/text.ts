import type { Product, AppSettings } from '@prisma/client';

export async function generateAdScript(product: Product, settings: AppSettings) {
  if (!settings.textApiKey) {
    throw new Error('Gemini API key not set. Go to Settings and add your Google AI API key.');
  }

  const prompt = `You are a UGC (user-generated content) TikTok ad scriptwriter. Write a punchy, authentic, conversational script for a 25-30 second TikTok video selling a product.

Product: ${product.name}
Description: ${product.description}
Target audience: ${product.targetAudience}
Hook: ${product.hook}
Key benefits: ${product.benefits}
Brand voice: ${settings.brandVoice}
Call to action: ${settings.defaultCta}

Rules:
- Sound like a real person talking to their phone, NOT a corporate ad
- Start with a strong hook that stops the scroll (use the hook provided as inspiration)
- Target exactly 100-120 words (25-30 seconds spoken at natural pace)
- Structure: Hook (5s) → Problem/relate (5s) → Product reveal + benefits (12s) → CTA (5s)
- No emojis, no hashtags — just the spoken script
- End with the CTA naturally woven in
- Use natural pauses and conversational rhythm — write how people actually talk

Output ONLY the spoken script. No stage directions, no labels, no extra text.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.textApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const script = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!script) throw new Error('Gemini returned no script content.');

  return {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    script
  };
}
