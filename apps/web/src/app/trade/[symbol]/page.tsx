import { TradeTerminal } from '@/components/trade/TradeTerminal';

type TradePageProps = {
  params: { symbol: string };
};

export default function TradePage({ params }: TradePageProps) {
  return <TradeTerminal symbol={params.symbol.toUpperCase()} />;
}
