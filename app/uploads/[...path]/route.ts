import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4'
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // Block path traversal
  if (path.some(p => p.includes('..'))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const filePath = join(process.cwd(), 'public', 'uploads', ...path);

  try {
    const file = await readFile(filePath);
    const ext = path[path.length - 1].split('.').pop()?.toLowerCase() ?? '';
    const contentType = MIME[ext] ?? 'application/octet-stream';

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
