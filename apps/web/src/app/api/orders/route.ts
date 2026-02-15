import { NextRequest, NextResponse } from 'next/server';

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';

type OpenOrder = {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  quantity: number;
  status: 'open';
};

const globalState = globalThis as typeof globalThis & { __mockOrders?: OpenOrder[] };

function getStore() {
  if (!globalState.__mockOrders) {
    globalState.__mockOrders = [
      { id: 'ord-1', symbol: 'BTCUSDT', side: 'buy', type: 'limit', price: 64000, quantity: 0.2, status: 'open' }
    ];
  }
  return globalState.__mockOrders;
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  const orders = getStore();
  const filtered = symbol ? orders.filter((o) => o.symbol === symbol.toUpperCase()) : orders;
  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const order: OpenOrder = {
    id: `ord-${Date.now()}`,
    symbol: String(body.symbol ?? 'BTCUSDT').toUpperCase(),
    side: body.side,
    type: body.type,
    quantity: Number(body.quantity),
    price: body.type === 'limit' ? Number(body.price) : undefined,
    status: 'open'
  };

  getStore().unshift(order);
  return NextResponse.json(order, { status: 201 });
}
