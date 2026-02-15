'use client';

import { useEffect, useRef } from 'react';

type TradeViewWidgetProps = {
  symbol: string;
};

export function TradeViewWidget({ symbol }: TradeViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: '5',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: false,
      hide_top_toolbar: false,
      withdateranges: true,
      save_image: false,
      details: true,
      studies: ['Volume@tv-basicstudies'],
      container_id: 'tradingview-widget-container'
    });

    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-2">
      <div className="tradingview-widget-container h-[420px] w-full" id="tradingview-widget-container" ref={containerRef} />
    </div>
  );
}
