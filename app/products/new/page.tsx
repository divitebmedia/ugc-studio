import { requireAuth } from '@/lib/auth';
import { AppNav } from '@/components/nav';
import Link from 'next/link';

export default async function NewProductPage() {
  await requireAuth();

  return (
    <div className="app-shell">
      <AppNav pathname="/products/new" />
      <main>
        <div style={{ maxWidth: 640 }}>
          <Link href="/products" style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>← Products</Link>
          <h1 className="page-title" style={{ marginBottom: 4 }}>New product</h1>
          <p className="page-sub">Fill in your product details — these are used to generate the script and UGC image</p>

          <div className="card">
            <form action="/api/products" method="post" encType="multipart/form-data">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Product name *</label>
                    <input className="input" name="name" required placeholder="e.g. AquaGlow Face Mist" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target audience *</label>
                    <input className="input" name="targetAudience" required placeholder="e.g. Women 18-34, skincare lovers" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Product description *</label>
                  <textarea className="input" name="description" required placeholder="What is this product? What does it do? Be specific — this goes directly into the AI prompt." />
                </div>

                <div className="form-group">
                  <label className="form-label">Hook <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <input className="input" name="hook" placeholder="e.g. I tested this for 7 days and my skin actually changed" />
                  <span className="form-hint">The opening line that stops the scroll. Leave blank and AI will write one.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Key benefits *</label>
                  <textarea className="input" name="benefits" required placeholder="e.g. Hydrates in 30 seconds, no sticky residue, works on sensitive skin" style={{ minHeight: 80 }} />
                  <span className="form-hint">List the 2-3 most compelling benefits. Bullet points or comma-separated.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Product image *</label>
                  <input className="input" type="file" name="image" accept="image/*" required />
                  <span className="form-hint">High-res photo of the product on a clean background works best for Imagen 3</span>
                </div>

                <hr className="divider" />

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" className="btn btn-primary">Create product →</button>
                  <Link href="/products" className="btn btn-ghost">Cancel</Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
