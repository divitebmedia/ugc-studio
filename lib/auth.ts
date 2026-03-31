import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'ugc_admin_session';

function getSecret() {
  return process.env.AUTH_SECRET || 'dev-secret-change-me';
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

export function buildSessionValue(email: string) {
  return `${email}.${sign(email)}`;
}

export function isValidSession(value?: string | null) {
  if (!value) return false;
  const lastDot = value.lastIndexOf('.');
  if (lastDot === -1) return false;
  const email = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  return !!email && sig === sign(email);
}

export async function requireAuth() {
  const store = await cookies();
  const session = store.get(COOKIE_NAME)?.value;
  if (!isValidSession(session)) redirect('/login');
  return session!.split('.')[0];
}

export async function setAuthCookie(email: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, buildSessionValue(email), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { httpOnly: true, path: '/', expires: new Date(0) });
}

export async function getIsAuthenticated() {
  const store = await cookies();
  return isValidSession(store.get(COOKIE_NAME)?.value);
}
