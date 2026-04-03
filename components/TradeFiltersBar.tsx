'use client';

import {
  SETUP_TYPES,
  SETUP_TYPE_LABELS,
  ALIGNMENTS,
  ALIGNMENT_LABELS,
  TRANSITIONS,
  TRANSITION_LABELS,
} from '@/types/setup';
import { formatPnl } from '@/lib/pnl';
import type { TradeFilters, TradeStats } from '@/lib/tradeFilters';

interface TradeFiltersBarProps {
  filters: TradeFilters;
  stats: TradeStats;
  onFiltersChange: (f: TradeFilters) => void;
}

// ── Chip styles ───────────────────────────────────────────────────────────────

const chipBase    = 'h-6 rounded px-2 text-[11px] font-medium transition-colors';
const chipOff     = 'border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300';
const chipOn      = 'border border-indigo-500/40 bg-indigo-500/15 text-indigo-300';

// ── Generic chip row ──────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export default function TradeFiltersBar({ filters, stats, onFiltersChange }: TradeFiltersBarProps) {
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

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      {/* Filter chip rows */}
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

      {/* Divider */}
      <div className="border-t border-zinc-800/80" />

      {/* Stats + clear */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-zinc-400 tabular-nums">
            {stats.count} trade{stats.count !== 1 ? 's' : ''}
          </span>
          <span className="text-zinc-500">
            P&L{' '}
            <span className={`font-mono font-medium tabular-nums ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
              <span className={`font-mono font-medium tabular-nums ${stats.avgPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
    </div>
  );
}
