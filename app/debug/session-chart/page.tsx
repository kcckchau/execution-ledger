import SessionChart from '@/components/SessionChart';
import { loadMarketSession } from '@/lib/marketSession';
import type { SessionChartData, SessionChartExecution } from '@/types/sessionChart';
import type { ActionType } from '@/types/setup';

const SYMBOL = 'QQQ';
const DATE = '2026-03-27';

function buildMockExecutions(session: SessionChartData): SessionChartExecution[] {
  const sorted = [...session.candles].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  if (sorted.length === 0) return [];

  const triple: { index: number; action: ActionType }[] =
    sorted.length >= 3
      ? [
          { index: 0, action: 'starter' },
          { index: Math.floor(sorted.length / 2), action: 'add' },
          { index: sorted.length - 1, action: 'trim' },
        ]
      : sorted.length === 2
        ? [
            { index: 0, action: 'starter' },
            { index: 1, action: 'add' },
            { index: 0, action: 'exit' },
          ]
        : [
            { index: 0, action: 'starter' },
            { index: 0, action: 'add' },
            { index: 0, action: 'exit' },
          ];

  return triple.map(({ index, action }) => {
    const c = sorted[index]!;
    return {
      time: c.time,
      price: c.close,
      action,
    };
  });
}

export default async function DebugSessionChartPage() {
  const result = await loadMarketSession(SYMBOL, DATE);

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
  const executions = buildMockExecutions(session);

  return (
    <div className="w-full px-4 py-6 md:px-8 md:py-10 lg:px-12">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Session chart (debug)</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {session.symbol} · {session.tradingDate} · {executions.length} mock markers
        </p>
      </header>
      <SessionChart session={session} executions={executions} />
    </div>
  );
}
