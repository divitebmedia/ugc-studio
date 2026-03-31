import type { AppSettings, Product } from '@prisma/client';
import { createHmac } from 'crypto';

// ── Kling JWT auth ────────────────────────────────────────────────────────────
function b64url(str: string) {
  return Buffer.from(str).toString('base64url');
}

function klingJWT(keyId: string, keySecret: string) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ iss: keyId, exp: now + 1800, nbf: now - 5 }));
  const sig = createHmac('sha256', keySecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

// ── Kling ─────────────────────────────────────────────────────────────────────
async function submitOneKlingClip(token: string, model: string, imageUrl: string, prompt: string): Promise<string> {
  const body = {
    model_name: model,
    prompt,
    negative_prompt: 'blurry, dark, professional studio, static, low quality',
    cfg_scale: 0.5,
    mode: 'std',
    aspect_ratio: '9:16',
    duration: '10',
    image: imageUrl
  };

  const res = await fetch('https://api.klingai.com/v1/videos/image2video', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kling API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (data.code !== 0) throw new Error(`Kling error: ${data.message}`);
  return data.data.task_id as string;
}

async function submitKling(settings: AppSettings, imageUrl: string, script: string): Promise<string> {
  const [keyId, keySecret] = settings.videoApiKey.split(':');
  if (!keyId || !keySecret) {
    throw new Error('Kling API key must be in format "accessKeyId:accessKeySecret"');
  }

  const model = settings.videoModel || 'kling-v1-6';
  const token = klingJWT(keyId, keySecret);

  const prompts = [
    `UGC TikTok creator introducing product: ${script.slice(0, 150)}. Natural hand gestures, energetic, authentic feel, talking to camera.`,
    `UGC TikTok creator demonstrating and showing product benefits: ${script.slice(150, 300)}. Enthusiastic, relatable, genuine reaction.`,
    `UGC TikTok creator closing with call to action: ${script.slice(-150)}. Pointing at camera, excited, direct eye contact, encouraging.`
  ];

  // Submit all 3 clips in parallel
  const taskIds = await Promise.all(
    prompts.map(p => submitOneKlingClip(token, model, imageUrl, p))
  );

  return taskIds.join(',');
}

async function pollOneKling(taskId: string, token: string): Promise<{ status: string; videoUrl?: string }> {
  const res = await fetch(`https://api.klingai.com/v1/videos/image2video/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error(`Kling poll error ${res.status}`);
  const data = await res.json();
  const status = data.data?.task_status;

  if (status === 'succeed') return { status: 'SUCCEEDED', videoUrl: data.data.task_result?.videos?.[0]?.url };
  if (status === 'failed') return { status: 'FAILED' };
  return { status: 'PENDING' };
}

export async function pollKling(providerRef: string, apiKey: string): Promise<{ status: string; videoUrls?: string[] }> {
  const [keyId, keySecret] = apiKey.split(':');
  const token = klingJWT(keyId, keySecret);
  const taskIds = providerRef.split(',');

  const results = await Promise.all(taskIds.map(id => pollOneKling(id.trim(), token)));

  if (results.some(r => r.status === 'FAILED')) return { status: 'FAILED' };
  if (results.every(r => r.status === 'SUCCEEDED')) {
    return { status: 'SUCCEEDED', videoUrls: results.map(r => r.videoUrl!) };
  }
  return { status: 'PENDING' };
}

// ── RunwayML ──────────────────────────────────────────────────────────────────
async function submitRunway(settings: AppSettings, imageUrl: string, script: string) {
  if (!settings.videoApiKey) throw new Error('RunwayML API key not set.');

  const res = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.videoApiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify({
      model: settings.videoModel || 'gen3a_turbo',
      promptImage: imageUrl,
      promptText: `UGC TikTok creator demonstrating product, natural movement, authentic, energetic`,
      ratio: '720:1280',
      duration: 10
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`RunwayML API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.id as string;
}

export async function pollRunway(taskId: string, apiKey: string): Promise<{ status: string; videoUrl?: string; videoUrls?: string[] }> {
  const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' }
  });

  if (!res.ok) throw new Error(`Runway poll error ${res.status}`);
  const data = await res.json();

  if (data.status === 'SUCCEEDED') return { status: 'SUCCEEDED', videoUrl: data.output?.[0] };
  if (data.status === 'FAILED') return { status: 'FAILED' };
  return { status: 'PENDING' };
}

// ── Hedra (talking head: image + audio → video) ───────────────────────────────
const HEDRA_BASE = 'https://api.hedra.com/web-app/public';

async function hedraCreateAsset(apiKey: string, type: 'image' | 'audio'): Promise<string> {
  const name = type === 'image' ? 'portrait.png' : 'voice.mp3';
  const res = await fetch(`${HEDRA_BASE}/assets`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, name })
  });
  if (!res.ok) throw new Error(`Hedra create asset (${type}) error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.id as string;
}

async function hedraUploadAsset(apiKey: string, assetId: string, buffer: Buffer, filename: string, mime: string) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mime }), filename);
  const res = await fetch(`${HEDRA_BASE}/assets/${assetId}/upload`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form
  });
  if (!res.ok) throw new Error(`Hedra upload asset error ${res.status}: ${await res.text()}`);
}

async function submitHedra(settings: AppSettings, imageBase64: string, audioPath: string): Promise<string> {
  const apiKey = (settings as AppSettings & { hedraApiKey?: string }).hedraApiKey || settings.videoApiKey;
  if (!apiKey) throw new Error('Hedra API key not set. Add it in Settings → Hedra API Key.');

  const { readFile } = await import('fs/promises');

  // 1. Upload portrait image (two-step: create asset → upload file)
  const imageAssetId = await hedraCreateAsset(apiKey, 'image');
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  await hedraUploadAsset(apiKey, imageAssetId, imageBuffer, 'portrait.png', 'image/png');

  // 2. Upload audio (two-step: create asset → upload file)
  const audioAssetId = await hedraCreateAsset(apiKey, 'audio');
  const audioBuffer = await readFile(audioPath);
  await hedraUploadAsset(apiKey, audioAssetId, audioBuffer, 'voice.mp3', 'audio/mpeg');

  // 3. Generate talking head video
  const genRes = await fetch(`${HEDRA_BASE}/generations`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'avatar',
      portraitAssetId: imageAssetId,
      audioAssetId: audioAssetId,
      aspectRatio: '9:16'
    })
  });
  if (!genRes.ok) throw new Error(`Hedra generate error ${genRes.status}: ${await genRes.text()}`);
  const genData = await genRes.json();
  return (genData.id || genData.generationId) as string;
}

export async function pollHedra(generationId: string, apiKey: string): Promise<{ status: string; videoUrl?: string; videoUrls?: string[] }> {
  const res = await fetch(`${HEDRA_BASE}/generations/${generationId}/status`, {
    headers: { 'X-API-Key': apiKey }
  });

  if (!res.ok) throw new Error(`Hedra poll error ${res.status}`);
  const data = await res.json();
  const s = (data.status || data.state || '').toLowerCase();

  if (s === 'completed' || s === 'succeeded') return { status: 'SUCCEEDED', videoUrl: data.videoUrl || data.video_url || data.url };
  if (s === 'failed' || s === 'error') return { status: 'FAILED' };
  return { status: 'PENDING' };
}

// ── Main submit entry point ───────────────────────────────────────────────────
export async function submitVideoJob(
  product: Product,
  settings: AppSettings,
  payload: { script: string; imageBase64: string; imageUrl: string; audioPath?: string; audioUrl?: string }
) {
  const provider = settings.videoProvider;

  let taskId: string;

  if (provider === 'kling') {
    taskId = await submitKling(settings, payload.imageBase64, payload.script);
  } else if (provider === 'runway') {
    taskId = await submitRunway(settings, payload.imageUrl, payload.script);
  } else if (provider === 'hedra') {
    if (!payload.audioPath) throw new Error('Hedra requires a voiceover. Generate voiceover first.');
    taskId = await submitHedra(settings, payload.imageBase64, payload.audioPath);
  } else {
    throw new Error(`Unknown video provider: ${provider}. Choose kling, runway, or hedra.`);
  }

  return { provider, taskId };
}
