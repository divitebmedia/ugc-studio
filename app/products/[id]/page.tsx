import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { AppNav } from '@/components/nav';
import { formatDate } from '@/lib/utils';
import { VideoPoller } from '@/components/video-poller';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const user = await ensureAdminUser();
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, userId: user.id },
    include: {
      assets: { orderBy: { createdAt: 'desc' } },
      jobs: { orderBy: { createdAt: 'desc' } }
    }
  });

  if (!product) notFound();

  const productImage = product.assets.find(a => a.type === 'PRODUCT_IMAGE');
  const ugcImage = product.assets.find(a => a.type === 'GENERATED_IMAGE');
  const voiceAsset = product.assets.find(a => a.type === 'VOICEOVER');
  const videoAsset = product.assets.find(a => a.type === 'GENERATED_VIDEO');

  const scriptJob = product.jobs.find(j => j.type === 'SCRIPT' && j.status === 'SUCCEEDED');
  const imageJob = product.jobs.find(j => j.type === 'IMAGE' && j.status === 'SUCCEEDED');
  const voiceJob = product.jobs.find(j => j.type === 'VOICEOVER' && j.status === 'SUCCEEDED');
  const pendingVideoJob = product.jobs.find(j => j.type === 'VIDEO' && j.status === 'PENDING');
  const videoJob = product.jobs.find(j => j.type === 'VIDEO' && j.status === 'SUCCEEDED');

  const failedJobs = product.jobs.filter(j => j.status === 'FAILED');

  const step1Done = !!scriptJob;
  const step2Done = !!imageJob && !!ugcImage;
  const step3Done = !!voiceJob && !!voiceAsset;
  const step4Done = !!videoJob || !!videoAsset;

  return (
    <div className="app-shell">
      <AppNav pathname="/products" />
      <main>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
          <div>
            <Link href="/products" style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>← Products</Link>
            <h1 className="page-title">{product.name}</h1>
            <p className="page-sub" style={{ marginBottom: 0 }}>{product.description}</p>
          </div>
          {productImage && (
            <img src={productImage.url} alt={product.name} style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
          )}
        </div>

        {/* Error alerts */}
        {failedJobs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {failedJobs.map(j => (
              <div key={j.id} className="alert alert-error">
                <span>✕</span>
                <span><strong>{j.type} failed:</strong> {j.error || 'Unknown error'}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-2" style={{ gap: 24 }}>
          {/* Pipeline */}
          <div>
            <h2 style={{ marginBottom: 14 }}>Generation pipeline</h2>
            <div className="pipeline">

              {/* Step 1: Script */}
              <div className={`pipeline-step ${step1Done ? 'step-done' : 'step-active'}`}>
                <div className="step-header">
                  <div className="step-num">{step1Done ? '✓' : '1'}</div>
                  <div className="step-info">
                    <div className="step-title">Generate script</div>
                    <div className="step-desc">Gemini writes a 20-30s UGC ad script</div>
                  </div>
                  {step1Done && <span className="badge badge-success">Done</span>}
                </div>
                {step1Done ? (
                  <div className="step-body">
                    <pre style={{ marginTop: 0 }}>{scriptJob?.output}</pre>
                    <form action={`/api/products/${product.id}/script`} method="post" style={{ marginTop: 10 }}>
                      <button type="submit" className="btn btn-ghost btn-sm">Regenerate script</button>
                    </form>
                  </div>
                ) : (
                  <div className="step-body">
                    <form action={`/api/products/${product.id}/script`} method="post">
                      <button type="submit" className="btn btn-primary">Generate script</button>
                    </form>
                  </div>
                )}
              </div>

              {/* Step 2: UGC Image */}
              <div className={`pipeline-step ${step2Done ? 'step-done' : step1Done ? 'step-active' : 'step-locked'}`}>
                <div className="step-header">
                  <div className="step-num">{step2Done ? '✓' : '2'}</div>
                  <div className="step-info">
                    <div className="step-title">Generate UGC image</div>
                    <div className="step-desc">Imagen 3 creates a realistic creator photo</div>
                  </div>
                  {step2Done && <span className="badge badge-success">Done</span>}
                </div>
                <div className="step-body">
                  {ugcImage && (
                    <img src={ugcImage.url} alt="UGC image" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10 }} />
                  )}
                  {step1Done && (
                    <form action={`/api/products/${product.id}/image`} method="post">
                      <button type="submit" className="btn btn-primary btn-sm">{step2Done ? 'Regenerate image' : 'Generate UGC image'}</button>
                    </form>
                  )}
                  {!step1Done && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Generate script first</p>}
                </div>
              </div>

              {/* Step 3: Voiceover */}
              <div className={`pipeline-step ${step3Done ? 'step-done' : step1Done ? 'step-active' : 'step-locked'}`}>
                <div className="step-header">
                  <div className="step-num">{step3Done ? '✓' : '3'}</div>
                  <div className="step-info">
                    <div className="step-title">Generate voiceover</div>
                    <div className="step-desc">ElevenLabs reads your script naturally</div>
                  </div>
                  {step3Done && <span className="badge badge-success">Done</span>}
                </div>
                <div className="step-body">
                  {voiceAsset && (
                    <audio controls src={voiceAsset.url} style={{ width: '100%', marginBottom: 10 }} />
                  )}
                  {step1Done && (
                    <form action={`/api/products/${product.id}/voiceover`} method="post">
                      <button type="submit" className="btn btn-primary btn-sm">{step3Done ? 'Regenerate voiceover' : 'Generate voiceover'}</button>
                    </form>
                  )}
                  {!step1Done && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Generate script first</p>}
                </div>
              </div>

              {/* Step 4: Video */}
              <div className={`pipeline-step ${step4Done ? 'step-done' : (step2Done || step3Done) ? 'step-active' : 'step-locked'}`}>
                <div className="step-header">
                  <div className="step-num">{step4Done ? '✓' : pendingVideoJob ? '⟳' : '4'}</div>
                  <div className="step-info">
                    <div className="step-title">Generate video</div>
                    <div className="step-desc">Animates your image into a TikTok video</div>
                  </div>
                  {step4Done && <span className="badge badge-success">Done</span>}
                  {pendingVideoJob && !step4Done && <span className="badge badge-pending">Processing…</span>}
                </div>
                <div className="step-body">
                  {(videoAsset || videoJob?.output) && (
                    <video
                      controls
                      src={videoAsset?.url || videoJob?.output || ''}
                      style={{ width: '100%', maxHeight: 360, borderRadius: 8, border: '1px solid var(--border)', background: '#000', marginBottom: 10 }}
                    />
                  )}
                  {(videoAsset || videoJob?.output) && (
                    <a href={videoAsset?.url || videoJob?.output || ''} download className="btn btn-secondary btn-sm" style={{ marginBottom: 10, display: 'inline-flex' }}>
                      ↓ Download video
                    </a>
                  )}

                  {pendingVideoJob && !step4Done && (
                    <VideoPoller jobId={pendingVideoJob.id} />
                  )}

                  {!pendingVideoJob && (step2Done || step3Done) && (
                    <form action={`/api/products/${product.id}/video`} method="post">
                      <button type="submit" className="btn btn-primary btn-sm">
                        {step4Done ? 'Regenerate video' : 'Generate video'}
                      </button>
                    </form>
                  )}
                  {!step2Done && !step3Done && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Generate image or voiceover first</p>}
                </div>
              </div>

            </div>
          </div>

          {/* Right column: product info + job history */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <h2 style={{ marginBottom: 14 }}>Product details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Audience</span><p style={{ margin: '3px 0 0', fontSize: 13 }}>{product.targetAudience}</p></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Hook</span><p style={{ margin: '3px 0 0', fontSize: 13 }}>{product.hook || '—'}</p></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Benefits</span><p style={{ margin: '3px 0 0', fontSize: 13 }}>{product.benefits}</p></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Created</span><p style={{ margin: '3px 0 0', fontSize: 13 }}>{formatDate(product.createdAt)}</p></div>
              </div>
            </div>

            <div className="card">
              <div className="section-header" style={{ marginBottom: 14 }}>
                <h2>Job history</h2>
                <Link href="/jobs" className="btn btn-ghost btn-sm">All jobs</Link>
              </div>
              {product.jobs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No jobs yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {product.jobs.slice(0, 10).map((job, i) => (
                    <div key={job.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: i < Math.min(product.jobs.length, 10) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{job.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{job.type} · {formatDate(job.createdAt)}</div>
                      </div>
                      <span className={`badge badge-${job.status === 'SUCCEEDED' ? 'success' : job.status === 'FAILED' ? 'failed' : 'pending'}`}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
