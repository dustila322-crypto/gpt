import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 'fill-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      price: 63895.4,
      quantity: 0.05,
      executedAt: new Date(Date.now() - 3600_000).toISOString()
    },
    {
      id: 'fill-2',
      symbol: 'ETHUSDT',
      side: 'sell',
      price: 3189.2,
      quantity: 0.8,
      executedAt: new Date(Date.now() - 7200_000).toISOString()
    }
  ]);
}
