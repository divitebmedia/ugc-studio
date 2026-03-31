import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { AppNav } from '@/components/nav';
import { formatDate } from '@/lib/utils';

export default async function JobsPage() {
  await requireAuth();
  const user = await ensureAdminUser();
  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: 'desc' }
  });

  const typeLabel: Record<string, string> = {
    SCRIPT: '✍️ Script',
    IMAGE: '🖼️ Image',
    VOICEOVER: '🎙️ Voice',
    VIDEO: '🎬 Video'
  };

  return (
    <div className="app-shell">
      <AppNav pathname="/jobs" />
      <main>
        <div style={{ marginBottom: 28 }}>
          <h1 className="page-title">Job history</h1>
          <p className="page-sub">All generation attempts across all products</p>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {jobs.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)' }}>No jobs yet</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>{job.title}</div>
                        {job.error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{job.error}</div>}
                        {job.status === 'SUCCEEDED' && job.type === 'VIDEO' && job.output && (
                          <a href={job.output} download style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, display: 'inline-block' }}>↓ Download</a>
                        )}
                      </td>
                      <td>
                        <Link href={`/products/${job.productId}`} style={{ color: 'var(--accent)', fontSize: 13 }}>{job.product.name}</Link>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{typeLabel[job.type] || job.type}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{job.provider || '—'}{job.model ? ` / ${job.model}` : ''}</td>
                      <td>
                        <span className={`badge badge-${job.status === 'SUCCEEDED' ? 'success' : job.status === 'FAILED' ? 'failed' : 'pending'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{formatDate(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
