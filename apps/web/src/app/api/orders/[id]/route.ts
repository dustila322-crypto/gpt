import { NextResponse } from 'next/server';

const globalState = globalThis as typeof globalThis & {
  __mockOrders?: Array<{ id: string }>;
};

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!globalState.__mockOrders) {
    return NextResponse.json({ ok: true });
  }

  globalState.__mockOrders = globalState.__mockOrders.filter((order) => order.id !== params.id);
  return NextResponse.json({ ok: true });
}
