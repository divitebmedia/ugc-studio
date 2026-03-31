import Link from 'next/link';
import { LogoutButton } from '@/components/logout-button';

const links = [
  ['Dashboard', '/dashboard'],
  ['Products', '/products'],
  ['Jobs', '/jobs'],
  ['Settings', '/settings']
];

export function AppNav({ pathname }: { pathname: string }) {
  const active = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <nav className="app-nav">
      <span className="brand">UGC<span>Studio</span></span>
      <div className="nav-links">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className={`nav-link ${active(href) ? 'active' : ''}`}>
            {label}
          </Link>
        ))}
      </div>
      <div className="nav-actions">
        <Link href="/products/new" className="btn btn-primary btn-sm">+ New product</Link>
        <LogoutButton />
      </div>
    </nav>
  );
}
