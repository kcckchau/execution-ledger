'use client';

import { useState, useCallback, useRef } from 'react';
import type { DayContext } from '@/types/dayContext';
import {
  MARKET_CONTEXTS,
  MARKET_CONTEXT_LABELS,
  REGIMES,
  TRANSITIONS,
  type Regime,
  type Transition,
  type MarketContext,
} from '@/types/setup';

interface DayContextCardProps {
  date: string;
  dayContext: DayContext | null;
  onUpdate: (dc: DayContext) => void;
}

// ── Segmented control ─────────────────────────────────────────────────────────

function Seg<T extends string>({
  value,
  options,
  getLabel,
  getActiveClass,
  onChange,
  dim,
}: {
  value: T | null;
  options: readonly T[];
  getLabel: (v: T) => string;
  getActiveClass: (v: T) => string;
  onChange: (v: T | null) => void;
  dim?: boolean;
}) {
  return (
    <div className="flex h-7 overflow-hidden rounded border border-zinc-700/60">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? null : o)}
          className={`flex-1 truncate px-1.5 text-[11px] font-medium transition-colors ${
            value === o
              ? getActiveClass(o)
              : dim
              ? 'bg-zinc-900 text-zinc-600 hover:text-zinc-400'
              : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {getLabel(o)}
        </button>
      ))}
    </div>
  );
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function regimeLabel(r: Regime): string {
  if (r === 'UP')         return '↑ Up';
  if (r === 'DOWN')       return '↓ Down';
  if (r === 'CHOP')       return '~ Chop';
  if (r === 'TRANSITION') return '⇄ Trans';
  return '↔ Range';
}
function regimeActive(r: Regime): string {
  if (r === 'UP')         return 'bg-emerald-700/60 text-emerald-200';
  if (r === 'DOWN')       return 'bg-rose-700/60    text-rose-200';
  if (r === 'CHOP')       return 'bg-yellow-700/60  text-yellow-200';
  if (r === 'TRANSITION') return 'bg-violet-700/60  text-violet-200';
  return                          'bg-amber-700/60  text-amber-200';
}
function transitionActive(t: Transition): string {
  if (t === 'FLIP')        return 'bg-violet-700/60 text-violet-200';
  if (t === 'FAILED_FLIP') return 'bg-orange-700/60 text-orange-200';
  return                          'bg-zinc-700      text-zinc-300';
}
function mktActive(m: MarketContext): string {
  if (m === 'uptrend')   return 'bg-emerald-700/60 text-emerald-200';
  if (m === 'downtrend') return 'bg-rose-700/60    text-rose-200';
  return                        'bg-zinc-700       text-zinc-300';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DayContextCard({ date, dayContext, onUpdate }: DayContextCardProps) {
  const [saving, setSaving] = useState(false);
  const [notesVal, setNotesVal] = useState(dayContext?.notes ?? '');
  const notesRef = useRef(notesVal);

  const current: DayContext = dayContext ?? {
    id: '',
    date,
    dayType: null,
    marketContext: null,
    initialRegime: null,
    entryRegime: null,
    transition: null,
    notes: '',
    createdAt: '',
    updatedAt: '',
  };

  const save = useCallback(
    async (patch: Partial<Omit<DayContext, 'id' | 'date' | 'createdAt' | 'updatedAt'>>) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/day-context/${date}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const updated: DayContext = await res.json();
          onUpdate(updated);
        }
      } finally {
        setSaving(false);
      }
    },
    [date, onUpdate],
  );

  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2.5">
      {/* ── Date label + saving indicator ── */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {formatDate(date)}
        </span>
        {saving && (
          <span className="text-[10px] text-zinc-600">saving…</span>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        <Field label="Market">
          <Seg
            value={current.marketContext}
            options={MARKET_CONTEXTS}
            getLabel={(m) => MARKET_CONTEXT_LABELS[m]}
            getActiveClass={mktActive}
            onChange={(v) => save({ marketContext: v })}
          />
        </Field>

        <Field label="Open">
          <Seg
            value={current.initialRegime}
            options={REGIMES}
            getLabel={regimeLabel}
            getActiveClass={regimeActive}
            onChange={(v) => save({ initialRegime: v })}
            dim
          />
        </Field>

        <Field label="Session">
          <Seg
            value={current.entryRegime}
            options={REGIMES}
            getLabel={regimeLabel}
            getActiveClass={regimeActive}
            onChange={(v) => save({ entryRegime: v })}
            dim
          />
        </Field>

        <Field label="Trans">
          <Seg
            value={current.transition}
            options={TRANSITIONS}
            getLabel={(t) => (t === 'NONE' ? 'None' : t === 'FLIP' ? 'Flip' : 'Failed')}
            getActiveClass={transitionActive}
            onChange={(v) => save({ transition: v })}
            dim
          />
        </Field>
      </div>

      {/* ── Notes ── */}
      <textarea
        rows={2}
        placeholder="Day notes…"
        value={notesVal}
        onChange={(e) => {
          setNotesVal(e.target.value);
          notesRef.current = e.target.value;
        }}
        onBlur={() => {
          if (notesRef.current !== (dayContext?.notes ?? '')) {
            save({ notes: notesRef.current });
          }
        }}
        className="w-full resize-none rounded border border-zinc-800 bg-transparent px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">{label}</span>
      {children}
    </div>
  );
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
