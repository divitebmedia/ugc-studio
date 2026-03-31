import { ensureAdminUser } from '@/lib/bootstrap';
import { setAuthCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get('email') || '');
  const password = String(form.get('password') || '');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-now';

  if (email !== adminEmail || password !== adminPassword) {
    redirect('/login?error=invalid_credentials');
  }

  await ensureAdminUser();
  await setAuthCookie(email);
  redirect('/dashboard');
}
