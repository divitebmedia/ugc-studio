'use client';

import { useState, useRef } from 'react';

interface HedraVoice {
  id: string;
  name: string;
  thumbnail_url?: string;
  description?: string;
  asset?: { url?: string; type?: string };
}

export function HedraVoicePicker() {
  const [voices, setVoices] = useState<HedraVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function loadVoices() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/hedra/voices');
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to load voices'); return; }
      setVoices(data.voices ?? []);
      setLoaded(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function playPreview(voice: HedraVoice) {
    const url = voice.asset?.url;
    if (!url) return;

    if (playing === voice.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }

    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    setPlaying(voice.id);
    audio.onended = () => setPlaying(null);
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Hedra Voices</span>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '5px 12px' }}
          onClick={loadVoices}
          disabled={loading}
        >
          {loading ? 'Loading…' : loaded ? 'Refresh' : 'Browse voices'}
        </button>
        {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
      </div>

      {loaded && voices.length === 0 && (
        <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No voices found on your Hedra account.</p>
      )}

      {voices.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {voices.map(v => (
            <div
              key={v.id}
              onClick={() => playPreview(v)}
              style={{
                background: 'var(--card)',
                border: `1.5px solid ${playing === v.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: 10,
                cursor: v.asset?.url ? 'pointer' : 'default',
                transition: 'border-color 0.15s'
              }}
            >
              {v.thumbnail_url && (
                <img
                  src={v.thumbnail_url}
                  alt={v.name}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, marginBottom: 6 }}
                />
              )}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{v.name}</div>
              {v.description && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{v.description}</div>
              )}
              {v.asset?.url && (
                <div style={{ fontSize: 11, color: playing === v.id ? 'var(--accent)' : 'var(--text-3)' }}>
                  {playing === v.id ? '⏸ Playing…' : '▶ Preview'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
