'use client';

import { useState } from 'react';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
}

export function VoicePicker({ defaultVoiceId }: { defaultVoiceId: string }) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(defaultVoiceId);
  const [loaded, setLoaded] = useState(false);

  async function loadVoices() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/elevenlabs/voices');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to load voices');
      } else {
        setVoices(data.voices);
        setLoaded(true);
        if (!data.voices.find((v: Voice) => v.voice_id === selected) && data.voices.length > 0) {
          setSelected(data.voices[0].voice_id);
        }
      }
    } catch {
      setError('Network error loading voices');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-group">
      <label className="form-label">Voice</label>

      {loaded && voices.length > 0 ? (
        <select
          className="input"
          name="voiceId"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {voices.map(v => (
            <option key={v.voice_id} value={v.voice_id}>
              {v.name} ({v.category})
            </option>
          ))}
        </select>
      ) : (
        <input
          className="input"
          name="voiceId"
          value={selected}
          onChange={e => setSelected(e.target.value)}
          placeholder="Voice ID"
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '5px 12px' }}
          onClick={loadVoices}
          disabled={loading}
        >
          {loading ? 'Loading…' : loaded ? 'Refresh voices' : 'Load my voices'}
        </button>
        {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
        {loaded && <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ {voices.length} voices loaded</span>}
      </div>

      <span className="form-hint">
        {loaded
          ? 'Select a voice from your ElevenLabs account above.'
          : 'Click "Load my voices" to see all voices on your account. Free plan only supports voices you own or cloned.'}
      </span>
    </div>
  );
}
