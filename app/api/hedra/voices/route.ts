import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';

export async function GET() {
  await requireAuth();
  const user = await ensureAdminUser();
  const settings = await prisma.appSettings.findUnique({ where: { userId: user.id } });
  const apiKey = (settings as typeof settings & { hedraApiKey?: string })?.hedraApiKey || settings?.videoApiKey || '';

  if (!apiKey) return NextResponse.json({ error: 'Hedra API key not set' }, { status: 400 });

  const res = await fetch('https://api.hedra.com/web-app/public/voices', {
    headers: { 'X-API-Key': apiKey }
  });

  if (!res.ok) return NextResponse.json({ error: `Hedra error ${res.status}` }, { status: res.status });

  const voices = await res.json();
  return NextResponse.json({ voices });
}
