import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Trading UI MVP</h1>
      <ul>
        <li>
          <Link href="/trade/BTCUSDT">Open trade terminal</Link>
        </li>
        <li>
          <Link href="/portfolio">Open portfolio</Link>
        </li>
      </ul>
    </main>
  );
}
