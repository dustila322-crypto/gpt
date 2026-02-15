import './globals.css';
import Link from 'next/link';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Trading UI MVP',
  description: 'Local preview for trade + portfolio pages'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav style={{ display: 'flex', gap: 16, padding: 12, borderBottom: '1px solid #1e293b' }}>
          <Link href="/trade/BTCUSDT">Trade BTCUSDT</Link>
          <Link href="/portfolio">Portfolio</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
