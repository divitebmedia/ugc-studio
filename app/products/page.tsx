import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { AppNav } from '@/components/nav';
import { formatDate } from '@/lib/utils';

export default async function ProductsPage() {
  await requireAuth();
  const user = await ensureAdminUser();
  const products = await prisma.product.findMany({
    where: { userId: user.id },
    include: { assets: true, jobs: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="app-shell">
      <AppNav pathname="/products" />
      <main>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 className="page-title">Products</h1>
            <p className="page-sub">Manage your products and generate UGC videos</p>
          </div>
          <Link href="/products/new" className="btn btn-primary">+ New product</Link>
        </div>

        {products.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <h2 style={{ marginBottom: 8 }}>No products yet</h2>
            <p style={{ marginBottom: 24 }}>Create your first product to start generating UGC videos</p>
            <Link href="/products/new" className="btn btn-primary">Create first product</Link>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Progress</th>
                    <th>Videos</th>
                    <th>Jobs</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => {
                    const thumb = product.assets.find(a => a.type === 'GENERATED_IMAGE' || a.type === 'PRODUCT_IMAGE');
                    const hasScript = product.jobs.some(j => j.type === 'SCRIPT' && j.status === 'SUCCEEDED');
                    const hasImage = product.assets.some(a => a.type === 'GENERATED_IMAGE');
                    const hasVoice = product.assets.some(a => a.type === 'VOICEOVER');
                    const videoCount = product.assets.filter(a => a.type === 'GENERATED_VIDEO').length;
                    const steps = [hasScript, hasImage, hasVoice, videoCount > 0];
                    const stepsComplete = steps.filter(Boolean).length;

                    return (
                      <tr key={product.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {thumb ? (
                              <img src={thumb.url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{product.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{product.targetAudience}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {['Script', 'Image', 'Voice', 'Video'].map((label, i) => (
                              <div key={label} title={label} style={{ width: 22, height: 22, borderRadius: 4, background: steps[i] ? 'var(--success-dim)' : 'var(--surface-2)', border: `1px solid ${steps[i] ? 'rgba(78,222,214,0.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: steps[i] ? 'var(--success)' : 'var(--text-3)' }}>
                                {steps[i] ? '✓' : (i + 1)}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ color: videoCount > 0 ? 'var(--success)' : 'var(--text-3)' }}>{videoCount}</td>
                        <td>{product.jobs.length}</td>
                        <td>{formatDate(product.createdAt)}</td>
                        <td>
                          <Link href={`/products/${product.id}`} className="btn btn-ghost btn-sm">Open →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
