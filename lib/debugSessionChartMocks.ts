import type { SessionChartData, SessionChartExecution } from '@/types/sessionChart';
import type { ActionType } from '@/types/setup';

/** Demo markers aligned to bars in the given session (debug page). */
export function buildMockExecutions(session: SessionChartData): SessionChartExecution[] {
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
