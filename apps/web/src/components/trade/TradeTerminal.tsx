'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { TradeViewWidget } from './TradeViewWidget';

type BookLevel = { price: number; size: number };
type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';
type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed';

type TradeEvent = { id: string; price: number; size: number; side: OrderSide; ts: string };
type OpenOrder = {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  quantity: number;
  status: 'open' | 'pending-create' | 'pending-cancel' | 'failed';
};

type OrderForm = {
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price: string;
};

type Toast = { id: string; title: string; message: string };

const reconnectDelays = [1000, 2000, 5000, 8000];

export function TradeTerminal({ symbol }: { symbol: string }) {
  const [bids, setBids] = useState<BookLevel[]>([]);
  const [asks, setAsks] = useState<BookLevel[]>([]);
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [form, setForm] = useState<OrderForm>({ side: 'buy', type: 'limit', quantity: '', price: '' });

  const pushToast = useCallback((title: string, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, title, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 3500);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadOpenOrders = async () => {
      try {
        const response = await fetch(`/api/orders?symbol=${symbol}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Failed to load open orders');
        const data = (await response.json()) as OpenOrder[];
        if (isMounted) setOpenOrders(data);
      } catch (error) {
        if (isMounted) pushToast('Order sync failed', (error as Error).message);
      }
    };

    loadOpenOrders().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [pushToast, symbol]);

  useEffect(() => {
    const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001/ws';
    const wsUrl = new URL(wsBase);
    wsUrl.searchParams.set('channel', `market:${symbol}`);

    let socket: WebSocket | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: number | null = null;
    let destroyed = false;

    const connect = () => {
      setConnectionState(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
      socket = new WebSocket(wsUrl.toString());

      socket.onopen = () => {
        reconnectAttempt = 0;
        setConnectionState('open');
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as {
          book?: { bids: BookLevel[]; asks: BookLevel[] };
          trade?: TradeEvent;
        };

        if (payload.book) {
          setBids(payload.book.bids);
          setAsks(payload.book.asks);
        }

        if (payload.trade) {
          setTrades((prev) => [payload.trade!, ...prev].slice(0, 40));
        }
      };

      socket.onerror = () => {
        pushToast('WebSocket error', 'Unable to read market stream. Retrying...');
      };

      socket.onclose = () => {
        if (destroyed) {
          setConnectionState('closed');
          return;
        }

        const delay = reconnectDelays[Math.min(reconnectAttempt, reconnectDelays.length - 1)];
        reconnectAttempt += 1;
        setConnectionState('reconnecting');
        reconnectTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [pushToast, symbol]);

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();

    const quantity = Number(form.quantity);
    const price = form.type === 'limit' ? Number(form.price) : undefined;

    if (!quantity || quantity <= 0 || (form.type === 'limit' && (!price || price <= 0))) {
      pushToast('Invalid order', 'Please enter valid quantity and price values.');
      return;
    }

    const tempId = `tmp-${Date.now()}`;
    const optimisticOrder: OpenOrder = {
      id: tempId,
      symbol,
      side: form.side,
      type: form.type,
      quantity,
      price,
      status: 'pending-create'
    };

    setOpenOrders((prev) => [optimisticOrder, ...prev]);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, side: form.side, type: form.type, quantity, price })
      });

      if (!response.ok) throw new Error('Order API rejected the request');

      const createdOrder = (await response.json()) as OpenOrder;
      setOpenOrders((prev) => prev.map((order) => (order.id === tempId ? { ...createdOrder, status: 'open' } : order)));
      setForm((prev) => ({ ...prev, quantity: '', price: '' }));
    } catch (error) {
      setOpenOrders((prev) => prev.filter((order) => order.id !== tempId));
      pushToast('Order creation failed', (error as Error).message);
    }
  };

  const cancelOrder = async (id: string) => {
    const snapshot = [...openOrders];
    setOpenOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status: 'pending-cancel' } : order)));

    try {
      const response = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Cancel request failed');
      setOpenOrders((prev) => prev.filter((order) => order.id !== id));
    } catch (error) {
      setOpenOrders(snapshot);
      pushToast('Cancel failed', (error as Error).message);
    }
  };

  const spread = useMemo(() => {
    if (!asks[0] || !bids[0]) return '-';
    return (asks[0].price - bids[0].price).toFixed(2);
  }, [asks, bids]);

  return (
    <main className="space-y-4 p-4 text-slate-100">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{symbol} Trading</h1>
        <p className="text-sm text-slate-300">WS: {connectionState}</p>
      </header>

      <TradeViewWidget symbol={symbol} />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-lg bg-slate-800" />
          <div className="h-48 animate-pulse rounded-lg bg-slate-800" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <h2 className="mb-2 font-medium">Order Book (spread: {spread})</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="mb-1 text-emerald-400">Bids</p>
                {bids.slice(0, 10).map((level) => (
                  <p key={`bid-${level.price}`}>{level.price.toFixed(2)} · {level.size.toFixed(4)}</p>
                ))}
              </div>
              <div>
                <p className="mb-1 text-rose-400">Asks</p>
                {asks.slice(0, 10).map((level) => (
                  <p key={`ask-${level.price}`}>{level.price.toFixed(2)} · {level.size.toFixed(4)}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <h2 className="mb-2 font-medium">Create order</h2>
            <form className="space-y-2 text-sm" onSubmit={submitOrder}>
              <div className="flex gap-2">
                <select className="w-full rounded bg-slate-900 p-2" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as OrderType }))}>
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                </select>
                <select className="w-full rounded bg-slate-900 p-2" value={form.side} onChange={(e) => setForm((prev) => ({ ...prev, side: e.target.value as OrderSide }))}>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <input className="w-full rounded bg-slate-900 p-2" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} />
              {form.type === 'limit' && (
                <input className="w-full rounded bg-slate-900 p-2" placeholder="Price" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
              )}
              <button className="w-full rounded bg-indigo-500 p-2 font-medium">Submit order</button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <h2 className="mb-2 font-medium">Recent trades</h2>
            <div className="space-y-1 text-sm">
              {trades.length === 0 ? <p className="text-slate-400">Waiting for trade feed...</p> : null}
              {trades.map((trade) => (
                <p key={trade.id} className={trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                  {trade.price.toFixed(2)} · {trade.size.toFixed(4)}
                </p>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <h2 className="mb-2 font-medium">Open orders</h2>
        <div className="space-y-2 text-sm">
          {openOrders.length === 0 ? <p className="text-slate-400">No open orders.</p> : null}
          {openOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded border border-slate-800 p-2">
              <p>
                {order.side.toUpperCase()} {order.quantity} {order.type === 'limit' ? `@ ${order.price}` : '(market)'}
                <span className="ml-2 text-xs text-slate-400">[{order.status}]</span>
              </p>
              <button
                className="rounded bg-slate-800 px-2 py-1 text-xs disabled:opacity-40"
                disabled={order.status === 'pending-cancel' || order.status === 'pending-create'}
                onClick={() => cancelOrder(order.id)}
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded border border-rose-700 bg-rose-950 p-3 text-sm text-rose-100 shadow">
            <p className="font-semibold">{toast.title}</p>
            <p>{toast.message}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
