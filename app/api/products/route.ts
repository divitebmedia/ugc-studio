import fs from 'node:fs/promises';
import path from 'node:path';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { ensureAdminUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  await requireAuth();
  const user = await ensureAdminUser();
  const form = await request.formData();
  const image = form.get('image') as File | null;

  const product = await prisma.product.create({
    data: {
      userId: user.id,
      name: String(form.get('name') || ''),
      description: String(form.get('description') || ''),
      targetAudience: String(form.get('targetAudience') || ''),
      hook: String(form.get('hook') || ''),
      benefits: String(form.get('benefits') || ''),
      status: 'ready'
    }
  });

  if (image && image.size > 0) {
    const bytes = Buffer.from(await image.arrayBuffer());
    const dir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(dir, { recursive: true });
    const safeName = `${product.id}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(dir, safeName);
    await fs.writeFile(filePath, bytes);

    await prisma.asset.create({
      data: {
        productId: product.id,
        type: 'PRODUCT_IMAGE',
        filename: safeName,
        mimeType: image.type || 'application/octet-stream',
        path: filePath,
        url: `/uploads/${safeName}`
      }
    });
  }

  redirect(`/products/${product.id}`);
}
