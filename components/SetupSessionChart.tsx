'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SessionChart from '@/components/SessionChart';
import { SETUP_TYPE_LABELS, type TradeSetup } from '@/types/setup';
import type { SessionChartData } from '@/types/sessionChart';
import type { TradeMarker, SetupMarkerMeta } from '@/types/chartMarker';

interface ChartDataResponse {
  session: SessionChartData | null;
  tradeMarkers: TradeMarker[] | null;
  setupMeta: SetupMarkerMeta[] | null;
}

interface SetupSessionChartProps {
  symbol: string;
  setupDate: string;
  /** All setups for this symbol on this date (both ideal and executed). */
  setups: TradeSetup[];
}

type ChartMode = 'executed' | 'ideal';

// Distinct chip colours cycled by setup index (on / off states).
const CHIP_COLORS_ON = [
  'border-indigo-500/40 bg-indigo-500/15 text-indigo-300',
  'border-amber-500/40  bg-amber-500/15  text-amber-300',
  'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  'border-rose-500/40   bg-rose-500/15   text-rose-300',
  'border-cyan-500/40   bg-cyan-500/15   text-cyan-300',
] as const;
const CHIP_OFF = 'border-zinc-700 bg-zinc-800 text-zinc-600';
const EXEC_ACTION_COLOR: Record<string, string> = {
  starter: '#22c55e',
  add: '#3b82f6',
  trim: '#eab308',
  exit: '#ef4444',
};
const EXEC_ACTION_TEXT: Record<string, string> = {
  starter: 'O',
  add: 'A',
  trim: 'T',
  exit: 'C',
};

function fallbackShapeForExecution(
  actionType: string,
  setupDirection: TradeSetup['direction'] | undefined,
): TradeMarker['shape'] {
  if (setupDirection !== 'long' && setupDirection !== 'short') return 'circle';
  const isEntry = actionType === 'starter' || actionType === 'add';
  if (setupDirection === 'long') return isEntry ? 'arrowUp' : 'arrowDown';
  return isEntry ? 'arrowDown' : 'arrowUp';
}

export default function SetupSessionChart({
  symbol,
  setupDate,
  setups,
}: SetupSessionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionChartData | null>(null);
  const [tradeMarkers, setTradeMarkers] = useState<TradeMarker[] | null>(null);
  const [setupMeta, setSetupMeta] = useState<SetupMarkerMeta[] | null>(null);
  const [toggledSetups, setToggledSetups] = useState<Set<string>>(new Set());
  const [chartMode, setChartMode] = useState<ChartMode>('executed');

  // Observe visibility — fetch only once when the container comes into view.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fetch chart data — only fires once inView becomes true.
  useEffect(() => {
    if (!inView) return;
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
  }, [symbol, setupDate, inView]);

  // Executions to use as fallback markers — filtered to the current chart mode.
  const executions = useMemo(
    () =>
      setups
        .filter((s) => (chartMode === 'executed' ? !s.isIdeal : s.isIdeal))
        .flatMap((s) => s.executions),
    [setups, chartMode],
  );

  // Setup IDs available in the selected mode (executed vs ideal).
  const setupIdsInMode = useMemo(
    () =>
      new Set(
        setups
          .filter((s) => (chartMode === 'executed' ? !s.isIdeal : s.isIdeal))
          .map((s) => s.id),
      ),
    [setups, chartMode],
  );

  // Build display labels: prefer setupName, then fall back to setupType + "#N" suffix.
  const setupLabels = useMemo<Record<string, string>>(() => {
    if (!setupMeta) return {};
    const typeCount: Record<string, number> = {};
    for (const s of setupMeta) {
      typeCount[s.setupType] = (typeCount[s.setupType] ?? 0) + 1;
    }
    const typeIdx: Record<string, number> = {};
    const result: Record<string, string> = {};
    for (const s of setupMeta) {
      if (s.setupName) {
        result[s.id] = s.setupName;
      } else {
        const base =
          SETUP_TYPE_LABELS[s.setupType as keyof typeof SETUP_TYPE_LABELS] ?? s.setupType;
        if (typeCount[s.setupType] > 1) {
          typeIdx[s.setupType] = (typeIdx[s.setupType] ?? 0) + 1;
          result[s.id] = `${base} #${typeIdx[s.setupType]}`;
        } else {
          result[s.id] = base;
        }
      }
    }
    return result;
  }, [setupMeta]);

  // Filter visible markers: unmatched markers (no setupId) are always shown.
  const modeSetupMeta = useMemo<SetupMarkerMeta[] | null>(() => {
    if (!setupMeta) return null;
    return setupMeta.filter((m) => setupIdsInMode.has(m.id));
  }, [setupMeta, setupIdsInMode]);

  const visibleMarkers = useMemo<TradeMarker[] | null>(() => {
    if (!tradeMarkers) return null;
    // Keep unmatched markers visible; hide linked markers outside selected mode.
    const modeFiltered = tradeMarkers.filter(
      (m) => m.setupId == null || setupIdsInMode.has(m.setupId),
    );
    if (!modeSetupMeta || modeSetupMeta.length <= 1) return modeFiltered;
    return modeFiltered.filter(
      (m) => m.setupId == null || toggledSetups.has(m.setupId)
    );
  }, [tradeMarkers, modeSetupMeta, setupIdsInMode, toggledSetups]);

  // Merge manual executions with DB markers:
  // - DB markers remain the source of truth when linked.
  // - Executions missing linked markers are rendered as fallback circles.
  const mergedMarkers = useMemo<TradeMarker[] | null>(() => {
    if (!visibleMarkers) return null;
    const directionBySetupId = new Map(setups.map((s) => [s.id, s.direction]));
    const linkedExecutionIds = new Set(
      visibleMarkers.map((m) => m.executionId).filter((id): id is string => typeof id === 'string' && id.length > 0),
    );
    const fallbackFromExecutions: TradeMarker[] = executions
      .filter((e) => !linkedExecutionIds.has(e.id))
      .map((e) => ({
        id: `exec-fallback-${e.id}`,
        time: e.executionTime,
        price: e.price,
        shape: fallbackShapeForExecution(e.actionType, directionBySetupId.get(e.setupId)),
        color: EXEC_ACTION_COLOR[e.actionType] ?? '#d4d4d8',
        text: EXEC_ACTION_TEXT[e.actionType] ?? 'E',
        action: e.actionType === 'trim' || e.actionType === 'exit' ? 'SELL' : 'BUY',
        executionId: e.id,
        setupId: e.setupId,
        setupType: null,
      }));
    return [...visibleMarkers, ...fallbackFromExecutions];
  }, [visibleMarkers, executions]);

  // Keep selected setup chips in sync when mode changes.
  useEffect(() => {
    setToggledSetups(new Set(modeSetupMeta?.map((s) => s.id) ?? []));
  }, [chartMode, modeSetupMeta]);

  function toggleSetup(id: string) {
    setToggledSetups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasIdeal = setups.some((s) => s.isIdeal);
  const hasExecuted = setups.some((s) => !s.isIdeal);
  const showModeToggle = hasIdeal && hasExecuted;
  const showSetupToggles = modeSetupMeta !== null && modeSetupMeta.length > 1;

  return (
    <div ref={containerRef} className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-b border-zinc-800">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {symbol} · Session
        </p>

        {/* Executed / Ideal mode toggle — only shown when there are both types */}
        {showModeToggle && (
          <div className="flex rounded border border-zinc-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setChartMode('executed')}
              className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                chartMode === 'executed'
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Executed
            </button>
            <button
              type="button"
              onClick={() => setChartMode('ideal')}
              className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors border-l border-zinc-700 ${
                chartMode === 'ideal'
                  ? 'bg-violet-900/60 text-violet-300'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Ideal
            </button>
          </div>
        )}

        {/* Per-setup filter chips (DB-backed broker markers only) */}
        {showSetupToggles && (
          <div className="flex flex-wrap gap-1">
            {modeSetupMeta?.map((s, idx) => {
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

      {/* Body */}
      {!inView || loading ? (
        <div className="px-4 py-6 text-center text-xs text-zinc-600">
          {loading ? 'Loading…' : 'Scroll to load chart'}
        </div>
      ) : !session ? (
        <div className="px-4 py-4 text-xs text-zinc-500">
          No intraday file for{' '}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">{symbol}</code> on{' '}
          {setupDate}.{' '}
          <span className="text-zinc-600">
            Add{' '}
            <code className="rounded bg-zinc-800 px-1 py-0.5">
              data/market/{symbol}/{setupDate}.json
            </code>
          </span>
        </div>
      ) : (
        <div className="px-2 pb-2 pt-1 sm:px-3">
          <SessionChart
            session={session}
            tradeMarkers={mergedMarkers === null ? undefined : mergedMarkers}
            executions={executions}
          />
        </div>
      )}
    </div>
  );
}
