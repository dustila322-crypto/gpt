import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    { asset: 'USDT', free: 15320.5, locked: 1200 },
    { asset: 'BTC', free: 0.7421, locked: 0.1 },
    { asset: 'ETH', free: 3.11, locked: 0 }
  ]);
}
