import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { AppNav } from '@/components/nav';
import { formatDate } from '@/lib/utils';

export default async function DashboardPage() {
  await requireAuth();
  const user = await ensureAdminUser();

  const [products, allJobs, settings] = await Promise.all([
    prisma.product.findMany({ where: { userId: user.id }, include: { assets: true, jobs: true }, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.appSettings.findUnique({ where: { userId: user.id } })
  ]);

  const totalProducts = await prisma.product.count({ where: { userId: user.id } });
  const totalJobs = await prisma.job.count({ where: { userId: user.id } });
  const totalVideos = await prisma.asset.count({ where: { product: { userId: user.id }, type: 'GENERATED_VIDEO' } });
  const successJobs = await prisma.job.count({ where: { userId: user.id, status: 'SUCCEEDED' } });

  const hasKeys = !!(settings?.textApiKey && settings?.elevenLabsApiKey && settings?.videoApiKey);

  return (
    <div className="app-shell">
      <AppNav pathname="/dashboard" />
      <main>
        {!hasKeys && (
          <div className="alert alert-warn" style={{ marginBottom: 24 }}>
            <span>⚠</span>
            <span>API keys not configured. <Link href="/settings" style={{ color: 'inherit', textDecoration: 'underline' }}>Go to Settings</Link> to add your Gemini, ElevenLabs, and video provider keys before generating content.</span>
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Your UGC TikTok video generation workspace</p>
        </div>

        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          <div className="kpi-card">
            <div className="kpi-value">{totalProducts}</div>
            <div className="kpi-label">Products</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{totalVideos}</div>
            <div className="kpi-label">Videos generated</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{successJobs}</div>
            <div className="kpi-label">Successful jobs</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{totalJobs}</div>
            <div className="kpi-label">Total jobs</div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="section-header">
              <h2>Recent products</h2>
              <Link href="/products" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ color: 'var(--text-3)', marginBottom: 16 }}>No products yet</p>
                <Link href="/products/new" className="btn btn-primary btn-sm">Create your first product</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {products.map((product, i) => {
                  const thumb = product.assets.find(a => a.type === 'GENERATED_IMAGE' || a.type === 'PRODUCT_IMAGE');
                  const videoCount = product.assets.filter(a => a.type === 'GENERATED_VIDEO').length;
                  return (
                    <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      {thumb ? (
                        <img src={thumb.url} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{videoCount} video{videoCount !== 1 ? 's' : ''} • {formatDate(product.createdAt)}</div>
                      </div>
                      <Link href={`/products/${product.id}`} className="btn btn-ghost btn-sm">Open</Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-header">
              <h2>Recent jobs</h2>
              <Link href="/jobs" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            {allJobs.length === 0 ? (
              <p style={{ color: 'var(--text-3)', padding: '32px 0', textAlign: 'center' }}>No jobs yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {allJobs.map((job, i) => (
                  <div key={job.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: i < allJobs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{job.type} • {formatDate(job.createdAt)}</div>
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

        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ marginBottom: 16 }}>How it works</h2>
          <div className="grid grid-3" style={{ gap: 12 }}>
            {[
              { icon: '📦', step: '1', title: 'Upload product', desc: 'Add your product details and image' },
              { icon: '✍️', step: '2', title: 'Generate script + image', desc: 'AI writes your UGC script and generates a realistic creator image using Gemini Imagen 3' },
              { icon: '🎙️', step: '3', title: 'Add voiceover', desc: 'ElevenLabs converts your script to a natural-sounding voice' },
              { icon: '🎬', step: '4', title: 'Generate video', desc: 'Your chosen video model (Kling / Runway / Hedra) animates the image' },
              { icon: '📱', step: '5', title: 'Download & post', desc: 'Download the 9:16 video and post to TikTok' },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="card-sm" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Step {step}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
