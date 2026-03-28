import DebugSessionChartClient from '@/components/DebugSessionChartClient';
import { loadMarketSession } from '@/lib/marketSession';
import { loadTradeMarkers, tradingDateYmdToCompact } from '@/lib/tradeMarkers';

const SYMBOL = 'QQQ';
const DATE = '2026-03-27';

export default async function DebugSessionChartPage() {
  const result = await loadMarketSession(SYMBOL, DATE);
  const tradeDateCompact = tradingDateYmdToCompact(DATE);
  const tradeMarkersResult = await loadTradeMarkers(SYMBOL, tradeDateCompact);

  if (!result.ok) {
    return (
      <div className="w-full px-4 py-6 md:px-8 md:py-10 lg:px-12">
        <h1 className="text-lg font-semibold text-zinc-100">Session chart (debug)</h1>
        <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-400">
          Could not load{' '}
          <code className="text-zinc-300">data/market/{SYMBOL}/{DATE}.json</code>
          {result.reason === 'not_found'
            ? ' — file not found.'
            : result.reason === 'invalid_json'
              ? ' — invalid JSON.'
              : ' — invalid path arguments.'}{' '}
          Add valid session JSON under that path to preview the chart.
        </p>
      </div>
    );
  }

  const session = result.data;
  const tradeMarkers = tradeMarkersResult.ok ? tradeMarkersResult.data.markers : undefined;

  return (
    <div className="w-full px-4 py-6 md:px-8 md:py-10 lg:px-12">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Session chart (debug)</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {session.symbol} · {session.tradingDate}
          {tradeMarkers !== undefined
            ? ` · IBKR markers (${tradeMarkers.length})`
            : ` · mock markers — add data/trades/${SYMBOL}/${tradeDateCompact}-markers.json`}
        </p>
      </header>
      <DebugSessionChartClient session={session} tradeMarkers={tradeMarkers} />
    </div>
  );
}
