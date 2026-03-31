'use client';

import { useEffect, useState } from 'react';

export function VideoPoller({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<'PENDING' | 'SUCCEEDED' | 'FAILED'>('PENDING');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(dotTimer);
  }, []);

  useEffect(() => {
    if (status !== 'PENDING') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/status`);
        const data = await res.json();
        if (data.status === 'SUCCEEDED') {
          setStatus('SUCCEEDED');
          setVideoUrl(data.output);
          // Reload the page to show the video in the pipeline
          window.location.reload();
        } else if (data.status === 'FAILED') {
          setStatus('FAILED');
        }
      } catch {
        // Silently retry
      }
    };

    poll();
    const timer = setInterval(poll, 8000);
    return () => clearInterval(timer);
  }, [jobId, status]);

  if (status === 'FAILED') {
    return (
      <div className="alert alert-error" style={{ marginBottom: 10 }}>
        <span>✕</span>
        <span>Video generation failed. Check your API key and try again.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="alert alert-info">
        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
        <span>Video is being generated{dots} Checking every 8 seconds.</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>This page will automatically refresh when the video is ready. You can leave and come back.</p>
    </div>
  );
}
