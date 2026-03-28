'use client';

import { useMemo, useState } from 'react';
import SessionChart from '@/components/SessionChart';
import { buildMockExecutions } from '@/lib/debugSessionChartMocks';
import {
  applyTimeframeToSession,
  CHART_TIMEFRAMES,
  type ChartTimeframeId,
} from '@/lib/sessionTimeframe';
import type { SessionChartData } from '@/types/sessionChart';
import type { TradeMarkerItem } from '@/types/tradeMarkers';

const selectClass =
  'h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30';

interface DebugSessionChartClientProps {
  session: SessionChartData;
  /** Set when `data/trades/...-markers.json` loaded; omit if file missing → mock markers. */
  tradeMarkers?: TradeMarkerItem[];
}

export default function DebugSessionChartClient({
  session,
  tradeMarkers,
}: DebugSessionChartClientProps) {
  const [timeframe, setTimeframe] = useState<ChartTimeframeId>('1m');

  const displaySession = useMemo(
    () => applyTimeframeToSession(session, timeframe),
    [session, timeframe]
  );

  const executions = useMemo(
    () => buildMockExecutions(displaySession),
    [displaySession]
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="debug-timeframe" className="text-xs font-medium text-zinc-400">
            Timeframe
          </label>
          <select
            id="debug-timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as ChartTimeframeId)}
            className={selectClass}
          >
            {CHART_TIMEFRAMES.map((tf) => (
              <option key={tf.id} value={tf.id}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>
        <p className="pb-2 text-xs text-zinc-500">
          {displaySession.candles.length} bars · {displaySession.barSize}
          {tradeMarkers !== undefined
            ? ` · ${tradeMarkers.length} IBKR markers`
            : ' · mock markers'}
        </p>
      </div>
      <SessionChart
        session={displaySession}
        tradeMarkers={tradeMarkers}
        executions={executions}
      />
    </>
  );
}
