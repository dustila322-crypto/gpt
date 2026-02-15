'use client';

import { useEffect, useState } from 'react';

type Balance = {
  asset: string;
  free: number;
  locked: number;
};

type Fill = {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  executedAt: string;
};

export default function PortfolioPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPortfolio = async () => {
      try {
        const [balancesResponse, fillsResponse] = await Promise.all([
          fetch('/api/portfolio/balances'),
          fetch('/api/portfolio/fills')
        ]);

        if (!balancesResponse.ok || !fillsResponse.ok) {
          throw new Error('Failed to fetch portfolio data');
        }

        const [balancesData, fillsData] = await Promise.all([
          balancesResponse.json() as Promise<Balance[]>,
          fillsResponse.json() as Promise<Fill[]>
        ]);

        if (!mounted) return;

        setBalances(balancesData);
        setFills(fillsData);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPortfolio();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="space-y-4 p-4 text-slate-100">
      <h1 className="text-2xl font-semibold">Portfolio</h1>

      {loading ? <div className="h-32 animate-pulse rounded-lg bg-slate-800" /> : null}
      {error ? <p className="rounded bg-rose-950 p-3 text-rose-200">{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <h2 className="mb-3 text-lg font-medium">Balances</h2>
            <div className="space-y-2 text-sm">
              {balances.map((balance) => (
                <div key={balance.asset} className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>{balance.asset}</span>
                  <span>
                    free: {balance.free.toFixed(4)} · locked: {balance.locked.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <h2 className="mb-3 text-lg font-medium">Execution history</h2>
            <div className="space-y-2 text-sm">
              {fills.map((fill) => (
                <div key={fill.id} className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>
                    {fill.symbol} {fill.side.toUpperCase()} {fill.quantity}
                  </span>
                  <span>
                    {fill.price.toFixed(2)} · {new Date(fill.executedAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
