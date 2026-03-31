import { clearAuthCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function POST() {
  await clearAuthCookie();
  redirect('/login');
}
