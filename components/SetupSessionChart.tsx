'use client';

import { useEffect, useMemo, useState } from 'react';
import SessionChart from '@/components/SessionChart';
import { SETUP_TYPE_LABELS } from '@/types/setup';
import type { SessionChartData } from '@/types/sessionChart';
import type { TradeMarkerItem } from '@/types/tradeMarkers';
import type { SetupMarkerMeta } from '@/types/chartMarker';
import type { Execution } from '@/types/setup';

interface ChartDataResponse {
  session: SessionChartData | null;
  tradeMarkers: TradeMarkerItem[] | null;
  setupMeta: SetupMarkerMeta[] | null;
}

interface SetupSessionChartProps {
  symbol: string;
  setupDate: string;
  executions: Execution[];
}

// Distinct chip colours cycled by setup index (on / off states).
const CHIP_COLORS_ON = [
  'border-indigo-500/40 bg-indigo-500/15 text-indigo-300',
  'border-amber-500/40  bg-amber-500/15  text-amber-300',
  'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  'border-rose-500/40   bg-rose-500/15   text-rose-300',
  'border-cyan-500/40   bg-cyan-500/15   text-cyan-300',
] as const;
const CHIP_OFF = 'border-zinc-700 bg-zinc-800 text-zinc-600';

export default function SetupSessionChart({
  symbol,
  setupDate,
  executions,
}: SetupSessionChartProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionChartData | null>(null);
  const [tradeMarkers, setTradeMarkers] = useState<TradeMarkerItem[] | null>(null);
  const [setupMeta, setSetupMeta] = useState<SetupMarkerMeta[] | null>(null);
  // Set of setupIds whose markers are currently visible. Starts with all enabled.
  const [toggledSetups, setToggledSetups] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/chart-data?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(setupDate)}`
    )
      .then((r) => r.json())
      .then((data: ChartDataResponse) => {
        if (cancelled) return;
        setSession(data.session);
        setTradeMarkers(data.tradeMarkers);
        setSetupMeta(data.setupMeta);
        // Enable all setups by default.
        setToggledSetups(new Set(data.setupMeta?.map((s) => s.id) ?? []));
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setTradeMarkers(null);
          setSetupMeta(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, setupDate]);

  // Build display labels: append " #N" when the same setupType appears more than once.
  const setupLabels = useMemo<Record<string, string>>(() => {
    if (!setupMeta) return {};
    const typeCount: Record<string, number> = {};
    for (const s of setupMeta) {
      typeCount[s.setupType] = (typeCount[s.setupType] ?? 0) + 1;
    }
    const typeIdx: Record<string, number> = {};
    const result: Record<string, string> = {};
    for (const s of setupMeta) {
      const base =
        SETUP_TYPE_LABELS[s.setupType as keyof typeof SETUP_TYPE_LABELS] ?? s.setupType;
      if (typeCount[s.setupType] > 1) {
        typeIdx[s.setupType] = (typeIdx[s.setupType] ?? 0) + 1;
        result[s.id] = `${base} #${typeIdx[s.setupType]}`;
      } else {
        result[s.id] = base;
      }
    }
    return result;
  }, [setupMeta]);

  // Filter visible markers: unmatched markers (no setupId) are always shown.
  const visibleMarkers = useMemo<TradeMarkerItem[] | null>(() => {
    if (!tradeMarkers) return null;
    if (!setupMeta || setupMeta.length <= 1) return tradeMarkers;
    return tradeMarkers.filter(
      (m) => m.setupId == null || toggledSetups.has(m.setupId)
    );
  }, [tradeMarkers, setupMeta, toggledSetups]);

  function toggleSetup(id: string) {
    setToggledSetups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

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

  const showToggles = setupMeta !== null && setupMeta.length > 1;

  return (
    <div className="border-t border-zinc-800 px-2 pt-3 pb-3 sm:px-3">
      {/* Header row: label + per-setup toggles */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Session chart
        </p>

        {showToggles && (
          <div className="flex flex-wrap gap-1">
            {setupMeta.map((s, idx) => {
              const on = toggledSetups.has(s.id);
              const colorOn = CHIP_COLORS_ON[idx % CHIP_COLORS_ON.length];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSetup(s.id)}
                  className={`h-5 rounded px-2 text-[10px] font-medium border transition-colors ${on ? colorOn : CHIP_OFF}`}
                >
                  {setupLabels[s.id] ?? s.setupType}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SessionChart
        session={session}
        tradeMarkers={visibleMarkers === null ? undefined : visibleMarkers}
        executions={executions}
      />
    </div>
  );
}
