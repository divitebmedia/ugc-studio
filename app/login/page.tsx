import { getIsAuthenticated } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  if (await getIsAuthenticated()) redirect('/dashboard');

  return (
    <main style={{ maxWidth: 480, paddingTop: 80 }}>
      <div className="card">
        <h1>UGC Video Studio v2</h1>
        <p className="help">Single-admin sign-in using your configured admin email and password from environment variables.</p>
        <form action="/api/auth/login" method="post">
          <label>
            Email
            <input className="input" type="email" name="email" placeholder="admin@example.com" required />
          </label>
          <label>
            Password
            <input className="input" type="password" name="password" placeholder="••••••••" required />
          </label>
          <button type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}
