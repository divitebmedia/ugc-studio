import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { AppNav } from '@/components/nav';

export default async function SettingsPage() {
  await requireAuth();
  const user = await ensureAdminUser();
  const s = await prisma.appSettings.findUnique({ where: { userId: user.id } });

  return (
    <div className="app-shell">
      <AppNav pathname="/settings" />
      <main>
        <div style={{ marginBottom: 28 }}>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Configure your API keys and generation preferences</p>
        </div>

        <form action="/api/settings" method="post" style={{ maxWidth: 680 }}>

          {/* Brand */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon" style={{ background: 'rgba(108,143,255,0.12)' }}>🎯</div>
              <div>
                <h2 style={{ marginBottom: 0 }}>Brand</h2>
                <p style={{ fontSize: 12, margin: 0 }}>Tone and messaging used across all generated scripts</p>
              </div>
            </div>
            <div className="settings-section-body">
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Brand voice</label>
                  <input className="input" name="brandVoice" defaultValue={s?.brandVoice || 'Casual, direct, conversion-focused'} placeholder="Casual, energetic, relatable" />
                  <span className="form-hint">Tone used when writing scripts</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Default CTA</label>
                  <input className="input" name="defaultCta" defaultValue={s?.defaultCta || 'Shop now — link in bio'} placeholder="Shop now — link in bio" />
                  <span className="form-hint">Call-to-action at the end of scripts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gemini */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon" style={{ background: 'rgba(78,222,214,0.12)' }}>✨</div>
              <div>
                <h2 style={{ marginBottom: 0 }}>Google Gemini + Imagen 3</h2>
                <p style={{ fontSize: 12, margin: 0 }}>Used for script generation (Gemini 2.0 Flash) and UGC image generation (Imagen 3)</p>
              </div>
            </div>
            <div className="settings-section-body">
              <div className="form-group">
                <label className="form-label">Google AI API Key</label>
                <input className="input" name="textApiKey" type="password" defaultValue={s?.textApiKey || ''} placeholder="AIza..." />
                <span className="form-hint">Get your key at <strong>aistudio.google.com</strong> → Get API key. One key covers both script + image generation.</span>
              </div>
              <div className="alert alert-info">
                <span>ℹ</span>
                <span>Imagen 3 generates a realistic UGC creator holding your product. Make sure Imagen API access is enabled on your Google AI project.</span>
              </div>
            </div>
          </div>

          {/* ElevenLabs */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon" style={{ background: 'rgba(245,166,35,0.12)' }}>🎙️</div>
              <div>
                <h2 style={{ marginBottom: 0 }}>ElevenLabs Voice</h2>
                <p style={{ fontSize: 12, margin: 0 }}>Converts your script to a natural-sounding voiceover</p>
              </div>
            </div>
            <div className="settings-section-body">
              <div className="form-group">
                <label className="form-label">ElevenLabs API Key</label>
                <input className="input" name="elevenLabsApiKey" type="password" defaultValue={s?.elevenLabsApiKey || ''} placeholder="sk_..." />
                <span className="form-hint">Get your key at <strong>elevenlabs.io</strong> → Profile → API Keys. Free plan gives 10,000 chars/month.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Voice ID</label>
                <input className="input" name="voiceId" defaultValue={s?.voiceId || '21m00Tcm4TlvDq8ikWAM'} placeholder="21m00Tcm4TlvDq8ikWAM" />
                <span className="form-hint">
                  Popular voices: <strong>Rachel</strong> = 21m00Tcm4TlvDq8ikWAM · <strong>Adam</strong> = pNInz6obpgDQGcFmaJgB · <strong>Bella</strong> = EXAVITQu4vr4xnSDxMaL. Find more at elevenlabs.io/voice-library
                </span>
              </div>
            </div>
          </div>

          {/* Video */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon" style={{ background: 'rgba(255,107,130,0.12)' }}>🎬</div>
              <div>
                <h2 style={{ marginBottom: 0 }}>Video Model</h2>
                <p style={{ fontSize: 12, margin: 0 }}>Animates your UGC image into a video</p>
              </div>
            </div>
            <div className="settings-section-body">
              <div className="form-group">
                <label className="form-label">Video provider</label>
                <select name="videoProvider" defaultValue={s?.videoProvider || 'kling'} className="input">
                  <option value="kling">Kling AI — image-to-video, natural motion (~$0.10/video)</option>
                  <option value="runway">RunwayML Gen-3 — high quality image-to-video (~$0.25/video)</option>
                  <option value="hedra">Hedra — talking head, lip-syncs to voiceover (requires voiceover step)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input className="input" name="videoApiKey" type="password" defaultValue={s?.videoApiKey || ''} placeholder="Depends on provider below" />
                <span className="form-hint">
                  <strong>Kling:</strong> format is <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>accessKeyId:accessKeySecret</code> (get at klingai.com → API)<br />
                  <strong>RunwayML:</strong> single API key (runwayml.com → Account → API Keys)<br />
                  <strong>Hedra:</strong> single API key (hedra.com → Settings → API)
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Model / version <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                <input className="input" name="videoModel" defaultValue={s?.videoModel || ''} placeholder="kling-v1-6 · gen3a_turbo · character-1" />
                <span className="form-hint">Leave blank to use the default model for your provider</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary">Save settings</button>
          </div>
        </form>
      </main>
    </div>
  );
}
