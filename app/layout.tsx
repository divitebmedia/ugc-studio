import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UGC Studio',
  description: 'Generate TikTok UGC videos from product photos'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
