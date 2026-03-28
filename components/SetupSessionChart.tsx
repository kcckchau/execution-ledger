'use client';

import { useEffect, useState } from 'react';
import SessionChart from '@/components/SessionChart';
import type { SessionChartData } from '@/types/sessionChart';
import type { TradeMarkerItem } from '@/types/tradeMarkers';
import type { Execution } from '@/types/setup';

interface ChartDataResponse {
  session: SessionChartData | null;
  tradeMarkers: TradeMarkerItem[] | null;
}

interface SetupSessionChartProps {
  symbol: string;
  setupDate: string;
  executions: Execution[];
}

export default function SetupSessionChart({
  symbol,
  setupDate,
  executions,
}: SetupSessionChartProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionChartData | null>(null);
  const [tradeMarkers, setTradeMarkers] = useState<TradeMarkerItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/chart-data?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(setupDate)}`
    )
      .then((r) => r.json())
      .then((data: ChartDataResponse) => {
        if (cancelled) return;
        setSession(data.session);
        setTradeMarkers(data.tradeMarkers);
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setTradeMarkers(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, setupDate]);

  if (loading) {
    return (
      <div className="border-t border-zinc-800 px-5 py-6 text-center text-xs text-zinc-500">
        Loading session chart…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="border-t border-zinc-800 px-5 py-4 text-xs text-zinc-500">
        No intraday file for{' '}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">{symbol}</code> on{' '}
        {setupDate}. Add{' '}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">
          data/market/{symbol}/{setupDate}.json
        </code>
        .
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-800 px-2 pt-3 pb-3 sm:px-3">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Session chart
      </p>
      <SessionChart
        session={session}
        tradeMarkers={tradeMarkers === null ? undefined : tradeMarkers}
        executions={executions}
      />
    </div>
  );
}
