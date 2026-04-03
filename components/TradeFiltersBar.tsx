'use client';

import {
  type TradeSetup,
  SETUP_TYPES,
  SETUP_TYPE_LABELS,
  ALIGNMENTS,
  ALIGNMENT_LABELS,
  TRANSITIONS,
  TRANSITION_LABELS,
} from '@/types/setup';
import { formatPnl } from '@/lib/pnl';
import {
  type TradeFilters,
  type TradeStats,
  type GroupRow,
  computeGroupedStats,
} from '@/lib/tradeFilters';

interface TradeFiltersBarProps {
  setups: TradeSetup[];
  filters: TradeFilters;
  stats: TradeStats;
  onFiltersChange: (f: TradeFilters) => void;
}

// ── Chip styles ───────────────────────────────────────────────────────────────

const chipBase = 'h-6 rounded px-2 text-[11px] font-medium transition-colors';
const chipOff  = 'border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300';
const chipOn   = 'border border-indigo-500/40 bg-indigo-500/15 text-indigo-300';

// ── Filter chip row ───────────────────────────────────────────────────────────

function FilterRow<T extends string>({
  label,
  options,
  active,
  getLabel,
  onToggle,
}: {
  label: string;
  options: readonly T[];
  active: string[];
  getLabel: (v: T) => string;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`${chipBase} ${active.includes(o) ? chipOn : chipOff}`}
          >
            {getLabel(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Breakdown table ───────────────────────────────────────────────────────────

// 5-column grid: [label] [n] [P&L] [Win%] [Avg]
const GRID = 'grid grid-cols-[1fr_24px_72px_36px_72px] gap-x-3';

function pnlClass(v: number) {
  return v >= 0 ? 'text-emerald-400' : 'text-rose-400';
}

function BreakdownSection({
  title,
  rows,
  getLabel,
}: {
  title: string;
  rows: GroupRow[];
  getLabel: (key: string) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {/* Column headers */}
      <div className={`${GRID} text-[10px] font-semibold uppercase tracking-wider`}>
        <span className="text-zinc-500">{title}</span>
        <span className="text-right text-zinc-700">n</span>
        <span className="text-right text-zinc-700">P&L</span>
        <span className="text-right text-zinc-700">Win</span>
        <span className="text-right text-zinc-700">Avg</span>
      </div>
      {/* Data rows */}
      {rows.map((row) => (
        <div key={row.key} className={`${GRID} text-xs`}>
          <span className="text-zinc-400">{getLabel(row.key)}</span>
          <span className="text-right font-mono tabular-nums text-zinc-500">
            {row.stats.count}
          </span>
          <span className={`text-right font-mono tabular-nums ${pnlClass(row.stats.totalPnl)}`}>
            {formatPnl(row.stats.totalPnl)}
          </span>
          <span className="text-right tabular-nums text-zinc-400">
            {row.stats.winRate !== null ? `${Math.round(row.stats.winRate * 100)}%` : '—'}
          </span>
          <span className={`text-right font-mono tabular-nums ${row.stats.avgPnl !== null ? pnlClass(row.stats.avgPnl) : 'text-zinc-600'}`}>
            {row.stats.avgPnl !== null ? formatPnl(row.stats.avgPnl) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TradeFiltersBar({
  setups,
  filters,
  stats,
  onFiltersChange,
}: TradeFiltersBarProps) {
  const hasFilters =
    filters.setupType.length > 0 ||
    filters.alignment.length > 0 ||
    filters.transition.length > 0;

  function toggle(key: keyof TradeFilters, value: string) {
    const current = filters[key];
    onFiltersChange({
      ...filters,
      [key]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  }

  // Grouped breakdown — computed from filtered setups
  const alignmentRows  = computeGroupedStats(setups, (s) => s.alignment,  ALIGNMENTS);
  const transitionRows = computeGroupedStats(setups, (s) => s.transition, TRANSITIONS);
  const setupTypeRows  = computeGroupedStats(setups, (s) => s.setupType,  SETUP_TYPES);
  const hasBreakdown   = stats.count > 0;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">

      {/* ── Filter chip rows ── */}
      <div className="flex flex-col gap-1.5">
        <FilterRow
          label="Setup"
          options={SETUP_TYPES}
          active={filters.setupType}
          getLabel={(s) => SETUP_TYPE_LABELS[s]}
          onToggle={(v) => toggle('setupType', v)}
        />
        <FilterRow
          label="Align"
          options={ALIGNMENTS}
          active={filters.alignment}
          getLabel={(a) => ALIGNMENT_LABELS[a]}
          onToggle={(v) => toggle('alignment', v)}
        />
        <FilterRow
          label="Trans"
          options={TRANSITIONS}
          active={filters.transition}
          getLabel={(t) => TRANSITION_LABELS[t]}
          onToggle={(v) => toggle('transition', v)}
        />
      </div>

      {/* ── Stats summary ── */}
      <div className="border-t border-zinc-800/80" />
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-zinc-400 tabular-nums">
            {stats.count} trade{stats.count !== 1 ? 's' : ''}
          </span>
          <span className="text-zinc-500">
            P&L{' '}
            <span className={`font-mono font-medium tabular-nums ${pnlClass(stats.totalPnl)}`}>
              {formatPnl(stats.totalPnl)}
            </span>
          </span>
          {stats.winRate !== null && (
            <span className="text-zinc-500">
              Win{' '}
              <span className="text-zinc-300">{Math.round(stats.winRate * 100)}%</span>
            </span>
          )}
          {stats.avgPnl !== null && (
            <span className="text-zinc-500">
              Avg{' '}
              <span className={`font-mono font-medium tabular-nums ${pnlClass(stats.avgPnl)}`}>
                {formatPnl(stats.avgPnl)}
              </span>
            </span>
          )}
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => onFiltersChange({ setupType: [], alignment: [], transition: [] })}
            className="shrink-0 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Breakdown tables ── */}
      {hasBreakdown && (
        <>
          <div className="border-t border-zinc-800/80" />
          <div className="flex flex-col gap-3">
            <BreakdownSection
              title="Alignment"
              rows={alignmentRows}
              getLabel={(k) => ALIGNMENT_LABELS[k as keyof typeof ALIGNMENT_LABELS] ?? k}
            />
            <BreakdownSection
              title="Transition"
              rows={transitionRows}
              getLabel={(k) => TRANSITION_LABELS[k as keyof typeof TRANSITION_LABELS] ?? k}
            />
            <BreakdownSection
              title="Setup type"
              rows={setupTypeRows}
              getLabel={(k) => SETUP_TYPE_LABELS[k as keyof typeof SETUP_TYPE_LABELS] ?? k}
            />
          </div>
        </>
      )}
    </div>
  );
}
