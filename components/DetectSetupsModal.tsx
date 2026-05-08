'use client';

import { useMemo, useState } from 'react';
import type { SetupDraft } from '@/lib/detectSetups';
import type { TradeMarker } from '@/types/chartMarker';
import type { SessionChartData } from '@/types/sessionChart';
import SessionChart, { type ExtraPriceLine } from '@/components/SessionChart';
import {
  TRIGGER_LABELS,
  KEY_LEVEL_LABELS,
  CONFIRMATION_LABELS,
  INVALIDATION_TYPE_LABELS,
} from '@/types/setup';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DETECTED_TYPE_LABELS: Record<string, string> = {
  VWAP_RECLAIM: 'VWAP Reclaim',
  VWAP_REJECT:  'VWAP Reject',
  SWEEP_FAIL:   'Sweep Fail',
};

// LineStyle.Dashed = 2
const DASHED = 2;

/** Price line configs for entry / stop / target. Direction-aware colors. */
function buildExtraPriceLines(draft: SetupDraft): ExtraPriceLine[] {
  return [
    {
      price: draft.entryPrice,
      title: 'Entry',
      color: '#818cf8', // indigo — neutral entry
      lineWidth: 2 as const,
      lineStyle: DASHED,
    },
    {
      price: draft.stopPrice,
      title: 'Stop',
      color: '#f87171', // red
      lineWidth: 1 as const,
      lineStyle: DASHED,
    },
    {
      price: draft.targetPrice,
      title: 'Target',
      color: '#34d399', // green
      lineWidth: 1 as const,
      lineStyle: DASHED,
    },
  ];
}

function buildSetupMarker(
  entry: SuggestionEntry,
  index: number,
  selected: boolean,
): TradeMarker | null {
  const { draft, status } = entry;
  if (!draft.detectedAt) return null;

  const isLong = draft.direction === 'long';
  const dimmed = status === 'skipped' || status === 'saved';
  const color = selected
    ? isLong ? '#34d399' : '#fb7185'
    : dimmed ? '#71717a' : '#a78bfa';
  const action = isLong ? 'BUY' : 'SELL';

  return {
    id: `detected-${draft.symbol}-${draft.setupDate}-${draft.detectedAt}-${index}`,
    time: draft.detectedAt,
    price: draft.entryPrice,
    shape: isLong ? 'arrowUp' : 'arrowDown',
    color,
    text: selected ? action : action[0],
    action,
    note: draft.overallNotes,
    setupType: draft.setupType,
    setupLabel: DETECTED_TYPE_LABELS[draft.setupType] ?? draft.setupType,
  };
}

function calcRR(entry: number, stop: number, target: number, direction: string): string {
  if (direction === 'long') {
    const risk = entry - stop;
    if (risk <= 0) return '—';
    return ((target - entry) / risk).toFixed(1) + 'R';
  }
  const risk = stop - entry;
  if (risk <= 0) return '—';
  return ((entry - target) / risk).toFixed(1) + 'R';
}

function fmtPrice(n: number): string {
  return '$' + n.toFixed(2);
}

// ── Per-suggestion state ───────────────────────────────────────────────────────

type SuggestionStatus = 'pending' | 'saving' | 'saved' | 'skipped' | 'error';

interface SuggestionEntry {
  draft: SetupDraft;
  status: SuggestionStatus;
  errorMsg?: string;
}

// ── SuggestionCard ────────────────────────────────────────────────────────────

interface SuggestionCardProps {
  entry: SuggestionEntry;
  selected: boolean;
  onSelect: () => void;
  onSave: () => void;
  onSkip: () => void;
}

function SuggestionCard({ entry, selected, onSelect, onSave, onSkip }: SuggestionCardProps) {
  const { draft, status, errorMsg } = entry;
  const isLong = draft.direction === 'long';
  const rr = calcRR(draft.entryPrice, draft.stopPrice, draft.targetPrice, draft.direction);

  const directionCls = isLong
    ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
    : 'bg-rose-500/10 text-rose-400 ring-rose-500/20';

  const isDimmed = status === 'saved' || status === 'skipped';

  return (
    <div
      onClick={!isDimmed ? onSelect : undefined}
      className={[
        'rounded-lg border p-4 flex flex-col gap-3 transition-all',
        isDimmed
          ? 'border-zinc-800/50 opacity-40 cursor-default'
          : selected
            ? 'border-indigo-500/60 bg-zinc-900/60 cursor-pointer ring-1 ring-indigo-500/20'
            : 'border-zinc-800 bg-zinc-950 cursor-pointer hover:border-zinc-700',
      ].join(' ')}
    >
      {/* ── Header row ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {selected && !isDimmed && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          )}
          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-zinc-700 text-zinc-200 ring-1 ring-inset ring-zinc-600/50">
            {DETECTED_TYPE_LABELS[draft.setupType] ?? draft.setupType}
          </span>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${directionCls}`}
          >
            {isLong ? 'Long' : 'Short'}
          </span>
          {(() => {
            const m = /at (\d{2}:\d{2} ET)/.exec(draft.overallNotes);
            return m ? <span className="text-xs text-zinc-500">{m[1]}</span> : null;
          })()}
        </div>

        {status === 'saved'   && <span className="text-xs font-medium text-emerald-400">Saved ✓</span>}
        {status === 'skipped' && <span className="text-xs text-zinc-600">Skipped</span>}
        {status === 'error'   && <span className="text-xs text-rose-400" title={errorMsg}>Failed</span>}
      </div>

      {/* ── Price row ── */}
      <div className="grid grid-cols-4 gap-3">
        {([
          ['Entry',  fmtPrice(draft.entryPrice)],
          ['Stop',   fmtPrice(draft.stopPrice)],
          ['Target', fmtPrice(draft.targetPrice)],
          ['R:R',    rr],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label}>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium tabular-nums text-white">{val}</p>
          </div>
        ))}
      </div>

      {/* ── Tags row ── */}
      <div className="flex flex-wrap gap-1.5">
        {draft.triggers.map((t) => (
          <span key={t} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-violet-900/30 text-violet-300 ring-1 ring-inset ring-violet-700/30">
            {TRIGGER_LABELS[t] ?? t}
          </span>
        ))}
        {draft.keyLevels.map((k) => (
          <span key={k} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-700/50">
            {KEY_LEVEL_LABELS[k] ?? k}
          </span>
        ))}
      </div>

      {/* ── Confirmation + invalidation ── */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <p className="text-xs text-zinc-500">
          <span className="text-zinc-600">Confirm: </span>
          {draft.confirmation.map((c) => CONFIRMATION_LABELS[c] ?? c).join(' · ')}
        </p>
        <p className="text-xs text-zinc-500">
          <span className="text-zinc-600">Invalidated by: </span>
          {INVALIDATION_TYPE_LABELS[draft.invalidationType] ?? draft.invalidationType}
        </p>
      </div>

      {/* ── Detection notes ── */}
      <p className="text-[11px] leading-relaxed text-zinc-500 border-t border-zinc-800/80 pt-3">
        {draft.overallNotes}
      </p>

      {/* ── Actions ── */}
      {status === 'pending' && (
        <div className="flex justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onSkip}
            className="h-7 px-3 rounded text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-7 px-4 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors"
          >
            Save as Ideal Setup →
          </button>
        </div>
      )}
      {status === 'saving' && (
        <div className="flex justify-end pt-1">
          <span className="text-xs text-zinc-500">Saving…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs text-rose-400">{errorMsg}</p>
          <button
            type="button"
            onClick={onSave}
            className="h-7 px-3 rounded text-xs text-rose-400 hover:text-rose-300 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface DetectSetupsModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultSymbol?: string;
  onConfirm: (draft: SetupDraft) => Promise<void>;
}

export default function DetectSetupsModal({
  open,
  onClose,
  defaultDate,
  defaultSymbol = 'QQQ',
  onConfirm,
}: DetectSetupsModalProps) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [date, setDate] = useState(
    defaultDate ?? new Date().toISOString().slice(0, 10),
  );
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionEntry[]>([]);
  const [session, setSession] = useState<SessionChartData | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Must be above the early return so hook call order is stable across renders.
  const selectedDraft = suggestions[selectedIndex]?.draft;
  const extraPriceLines = useMemo(
    () => (selectedDraft ? buildExtraPriceLines(selectedDraft) : []),
    [selectedDraft],
  );
  const setupMarkers = useMemo(
    () =>
      suggestions
        .map((entry, index) => buildSetupMarker(entry, index, index === selectedIndex))
        .filter((marker): marker is TradeMarker => marker !== null),
    [suggestions, selectedIndex],
  );

  if (!open) return null;

  async function runDetection() {
    setFetchStatus('loading');
    setFetchError(null);
    setSuggestions([]);
    setSession(null);

    try {
      const res = await fetch('/api/setups/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.trim().toUpperCase(), date }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data?.error ?? 'Detection failed');
        setFetchStatus('error');
        return;
      }
      setSuggestions(
        (data.suggestions as SetupDraft[]).map((draft) => ({ draft, status: 'pending' as SuggestionStatus })),
      );
      setSession(data.session ?? null);
      setSelectedIndex(0);
      setFetchStatus('done');
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Network error');
      setFetchStatus('error');
    }
  }

  function updateEntry(index: number, patch: Partial<SuggestionEntry>) {
    setSuggestions((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  }

  async function save(index: number) {
    const entry = suggestions[index];
    if (!entry || entry.status !== 'pending') return;
    updateEntry(index, { status: 'saving', errorMsg: undefined });
    try {
      await onConfirm(entry.draft);
      updateEntry(index, { status: 'saved' });
    } catch (e) {
      updateEntry(index, {
        status: 'error',
        errorMsg: e instanceof Error ? e.message : 'Failed to save',
      });
    }
  }

  function skip(index: number) {
    updateEntry(index, { status: 'skipped' });
  }

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;
  const savedCount   = suggestions.filter((s) => s.status === 'saved').length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[min(96vw,1280px)] rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Detect Ideal Setups</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Scan intraday candles for VWAP reclaim, VWAP reject, and sweep fail patterns.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-5">

          {/* ── Inputs ── */}
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="QQQ"
                className={
                  'h-9 w-24 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white uppercase ' +
                  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors'
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={
                  'h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white ' +
                  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors'
                }
              />
            </div>
            <button
              type="button"
              onClick={runDetection}
              disabled={fetchStatus === 'loading' || !symbol.trim() || !date}
              className={
                'h-9 px-5 rounded-md text-sm font-medium transition-colors ' +
                'bg-violet-700 text-white hover:bg-violet-600 ' +
                'disabled:opacity-50 disabled:cursor-not-allowed'
              }
            >
              {fetchStatus === 'loading' ? 'Detecting…' : 'Detect'}
            </button>
          </div>

          {/* ── Loading ── */}
          {fetchStatus === 'loading' && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="animate-spin inline-block">⟳</span>
              Scanning candles…
            </div>
          )}

          {/* ── Fetch error ── */}
          {fetchStatus === 'error' && fetchError && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2.5">
              <p className="text-xs text-rose-400">{fetchError}</p>
            </div>
          )}

          {/* ── No results ── */}
          {fetchStatus === 'done' && suggestions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500">No setups detected for this session.</p>
              <p className="text-xs text-zinc-600 mt-1">
                Try a different date or check that session data exists for {symbol}.
              </p>
            </div>
          )}

          {/* ── Chart + results ── */}
          {suggestions.length > 0 && session && (
            <>
              {/* Chart — shows the full session with the selected setup's price levels */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wide">
                    {symbol} · {date}
                  </p>
                  {selectedDraft && (
                    <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 border-t-2 border-dashed border-[#818cf8]" />
                        Entry {fmtPrice(selectedDraft.entryPrice)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 border-t border-dashed border-[#f87171]" />
                        Stop {fmtPrice(selectedDraft.stopPrice)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 border-t border-dashed border-[#34d399]" />
                        Target {fmtPrice(selectedDraft.targetPrice)}
                      </span>
                    </div>
                  )}
                </div>
                <SessionChart
                  session={session}
                  tradeMarkers={setupMarkers}
                  extraPriceLines={extraPriceLines}
                  height="h-[min(58vh,620px)] min-h-[420px]"
                />
              </div>

              {/* Suggestion list */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    {suggestions.length} setup{suggestions.length !== 1 ? 's' : ''} detected
                    {savedCount > 0 && (
                      <span className="ml-2 text-emerald-400">{savedCount} saved</span>
                    )}
                  </p>
                  {pendingCount > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        suggestions.forEach((_, i) => {
                          if (suggestions[i].status === 'pending') save(i);
                        });
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Save all ({pendingCount})
                    </button>
                  )}
                </div>

                {suggestions.map((entry, i) => (
                  <SuggestionCard
                    key={i}
                    entry={entry}
                    selected={selectedIndex === i}
                    onSelect={() => setSelectedIndex(i)}
                    onSave={() => save(i)}
                    onSkip={() => skip(i)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Footer: show "Done" once all pending are resolved ── */}
        {fetchStatus === 'done' && pendingCount === 0 && savedCount > 0 && (
          <div className="px-5 py-3 border-t border-zinc-800 shrink-0 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-md bg-zinc-700 text-white text-xs font-medium hover:bg-zinc-600 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
