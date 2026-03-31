import { getIsAuthenticated } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getIsAuthenticated()) redirect('/dashboard');
  const { error } = await searchParams;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>UGC Studio</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 6 }}>Sign in to your workspace</p>
        </div>

        <div className="card">
          {error === 'invalid_credentials' && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>✕</span>
              <span>Incorrect email or password.</span>
            </div>
          )}
          <form action="/api/auth/login" method="post">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
