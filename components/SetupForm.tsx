'use client';

import { useMemo, useState } from 'react';
import {
  type TradeSetup,
  type SetupType,
  type Grade,
  type Direction,
  type MarketContext,
  type Regime,
  type Transition,
  type Alignment,
  SETUP_TYPES,
  SETUP_TYPE_LABELS,
  GRADES,
  DIRECTIONS,
  MARKET_CONTEXTS,
  MARKET_CONTEXT_LABELS,
  REGIMES,
  TRANSITIONS,
  ALIGNMENTS,
} from '@/types/setup';
import { getTodayInEasternTime } from '@/lib/dateUtils';
import { formatPlannedRiskReward } from '@/lib/plannedRiskReward';

interface SetupFormProps {
  onLog: (setup: TradeSetup) => void;
  onClose: () => void;
  /** When provided the form operates in edit mode — calls onSave instead of onLog. */
  initialSetup?: TradeSetup;
  onSave?: (setup: TradeSetup) => void;
}

function makeDefaultForm(init?: TradeSetup) {
  if (init) {
    return {
      symbol: init.symbol,
      direction: init.direction,
      marketContext: init.marketContext,
      setupType: init.setupType,
      trigger: init.trigger,
      invalidation: init.invalidation,
      decisionTarget: init.decisionTarget,
      riskEntry: init.riskEntry,
      riskStop: init.riskStop,
      riskTarget: init.riskTarget,
      initialGrade: (init.initialGrade ?? '') as Grade | '',
      overallNotes: init.overallNotes,
      setupDate: init.setupDate,
      initialRegime: (init.initialRegime ?? '') as Regime | '',
      entryRegime:   (init.entryRegime   ?? '') as Regime | '',
      transition:    (init.transition    ?? '') as Transition | '',
      alignment:     (init.alignment     ?? '') as Alignment | '',
    };
  }
  return {
    symbol: '',
    direction: 'long' as Direction,
    marketContext: 'range' as MarketContext,
    setupType: SETUP_TYPES[0] as SetupType,
    trigger: '',
    invalidation: '',
    decisionTarget: '',
    riskEntry: '',
    riskStop: '',
    riskTarget: '',
    initialGrade: '' as Grade | '',
    overallNotes: '',
    setupDate: getTodayInEasternTime(),
    initialRegime: '' as Regime | '',
    entryRegime:   '' as Regime | '',
    transition:    '' as Transition | '',
    alignment:     '' as Alignment | '',
  };
}

// ── Segmented control ─────────────────────────────────────────────────────────

function Seg<T extends string>({
  value,
  options,
  getLabel,
  getActiveClass,
  onChange,
}: {
  value: T | '';
  options: readonly T[];
  getLabel: (v: T) => string;
  getActiveClass: (v: T) => string;
  onChange: (v: T | '') => void;
}) {
  return (
    <div className="flex h-9 overflow-hidden rounded-md border border-zinc-700">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? '' : o)}
          className={`flex-1 truncate px-1.5 text-xs font-medium transition-colors ${
            value === o
              ? getActiveClass(o)
              : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-750 hover:text-zinc-300'
          }`}
        >
          {getLabel(o)}
        </button>
      ))}
    </div>
  );
}

// Active-state color helpers
function regimeActive(r: Regime): string {
  if (r === 'UP')   return 'bg-emerald-600/80 text-emerald-100 ring-1 ring-inset ring-emerald-400/30';
  if (r === 'DOWN') return 'bg-rose-600/80    text-rose-100    ring-1 ring-inset ring-rose-400/30';
  return                    'bg-amber-600/80  text-amber-100   ring-1 ring-inset ring-amber-400/30';
}
function transitionActive(t: Transition): string {
  if (t === 'FLIP')        return 'bg-violet-600/80 text-violet-100 ring-1 ring-inset ring-violet-400/30';
  if (t === 'FAILED_FLIP') return 'bg-orange-600/80 text-orange-100 ring-1 ring-inset ring-orange-400/30';
  return                          'bg-zinc-600      text-zinc-200   ring-1 ring-inset ring-zinc-500/30';
}
function alignmentActive(a: Alignment): string {
  if (a === 'WITH_TREND') return 'bg-teal-600/80   text-teal-100   ring-1 ring-inset ring-teal-400/30';
  return                         'bg-orange-600/80 text-orange-100 ring-1 ring-inset ring-orange-400/30';
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const inputClass =
  'h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors';

const textareaClass =
  'rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white resize-none ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors';

const sectionTitleClass =
  'text-[11px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 pb-2';

const labelClass    = 'text-xs font-medium text-zinc-400';
const labelDimClass = 'text-xs font-medium text-zinc-500'; // lower-priority fields

// ── Component ─────────────────────────────────────────────────────────────────

export default function SetupForm({ onLog, onClose, initialSetup, onSave }: SetupFormProps) {
  const isEdit = !!initialSetup;
  const [form, setForm] = useState(() => makeDefaultForm(initialSetup));
  const [saving, setSaving] = useState(false);

  const plannedRR = useMemo(
    () => formatPlannedRiskReward(form.riskEntry, form.riskStop, form.riskTarget, form.direction),
    [form.riskEntry, form.riskStop, form.riskTarget, form.direction]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.symbol.trim() ||
      !form.trigger.trim() ||
      !form.invalidation.trim() ||
      !form.decisionTarget.trim()
    ) {
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const classification = {
        initialRegime: (form.initialRegime as Regime) || null,
        entryRegime:   (form.entryRegime   as Regime) || null,
        transition:    (form.transition    as Transition) || null,
        alignment:     (form.alignment     as Alignment) || null,
      };

      if (isEdit && initialSetup && onSave) {
        await onSave({
          ...initialSetup,
          setupDate: form.setupDate,
          symbol: form.symbol.trim().toUpperCase(),
          direction: form.direction,
          marketContext: form.marketContext,
          setupType: form.setupType,
          trigger: form.trigger.trim(),
          invalidation: form.invalidation.trim(),
          decisionTarget: form.decisionTarget.trim(),
          riskEntry: form.riskEntry.trim(),
          riskStop: form.riskStop.trim(),
          riskTarget: form.riskTarget.trim(),
          initialGrade: (form.initialGrade as Grade) || null,
          overallNotes: form.overallNotes.trim(),
          updatedAt: now,
          ...classification,
        });
      } else {
        onLog({
          id: crypto.randomUUID(),
          setupDate: form.setupDate,
          symbol: form.symbol.trim().toUpperCase(),
          direction: form.direction,
          marketContext: form.marketContext,
          setupType: form.setupType,
          trigger: form.trigger.trim(),
          invalidation: form.invalidation.trim(),
          decisionTarget: form.decisionTarget.trim(),
          riskEntry: form.riskEntry.trim(),
          riskStop: form.riskStop.trim(),
          riskTarget: form.riskTarget.trim(),
          initialGrade: (form.initialGrade as Grade) || null,
          status: 'open',
          overallNotes: form.overallNotes.trim(),
          review: null,
          executions: [],
          createdAt: now,
          updatedAt: now,
          ...classification,
        });
        setForm(makeDefaultForm());
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
    >
      {/* ── Title ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{isEdit ? 'Edit Setup' : 'New Setup'}</h2>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>

      {/* ── Identity row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Symbol</label>
          <input
            type="text"
            placeholder="AAPL"
            value={form.symbol}
            onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Direction</label>
          <div className="flex h-9 overflow-hidden rounded-md border border-zinc-700">
            {DIRECTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((f) => ({ ...f, direction: d }))}
                className={`flex-1 text-xs font-bold transition-colors ${
                  form.direction === d
                    ? d === 'long'
                      ? 'bg-emerald-600 text-white ring-2 ring-inset ring-emerald-300/80'
                      : 'bg-rose-600 text-white ring-2 ring-inset ring-rose-300/80'
                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-800/90 hover:text-zinc-300'
                }`}
              >
                {d === 'long' ? '↑ Long' : '↓ Short'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Trading Date <span className="font-normal text-zinc-600">(ET)</span>
          </label>
          <input
            type="date"
            value={form.setupDate}
            onChange={(e) => setForm((f) => ({ ...f, setupDate: e.target.value }))}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Grade</label>
          <select
            value={form.initialGrade}
            onChange={(e) => setForm((f) => ({ ...f, initialGrade: e.target.value as Grade | '' }))}
            className={inputClass}
          >
            <option value="">—</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Decision (includes classification) ── */}
      <div className="flex flex-col gap-3">
        <h3 className={sectionTitleClass}>Decision</h3>

        {/* Row 1: Setup type + Alignment — highest signal pair */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Setup type</label>
            <select
              value={form.setupType}
              onChange={(e) => setForm((f) => ({ ...f, setupType: e.target.value as SetupType }))}
              className={inputClass}
            >
              {SETUP_TYPES.map((s) => (
                <option key={s} value={s}>{SETUP_TYPE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Alignment</label>
            <Seg
              value={form.alignment}
              options={ALIGNMENTS}
              getLabel={(a) => (a === 'WITH_TREND' ? 'With Trend' : 'Counter')}
              getActiveClass={alignmentActive}
              onChange={(v) => setForm((f) => ({ ...f, alignment: v }))}
            />
          </div>
        </div>

        {/* Row 2: Market context + Entry regime */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Market context</label>
            <select
              value={form.marketContext}
              onChange={(e) => setForm((f) => ({ ...f, marketContext: e.target.value as MarketContext }))}
              className={inputClass}
            >
              {MARKET_CONTEXTS.map((mc) => (
                <option key={mc} value={mc}>{MARKET_CONTEXT_LABELS[mc]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Entry regime</label>
            <Seg
              value={form.entryRegime}
              options={REGIMES}
              getLabel={(r) => (r === 'UP' ? '↑ Up' : r === 'DOWN' ? '↓ Down' : '↔ Range')}
              getActiveClass={regimeActive}
              onChange={(v) => setForm((f) => ({ ...f, entryRegime: v }))}
            />
          </div>
        </div>

        {/* Row 3: Transition + Initial regime — lower priority */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Transition</label>
            <Seg
              value={form.transition}
              options={TRANSITIONS}
              getLabel={(t) => (t === 'NONE' ? '—' : t === 'FLIP' ? 'Flip' : 'Failed')}
              getActiveClass={transitionActive}
              onChange={(v) => setForm((f) => ({ ...f, transition: v }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelDimClass}>Initial regime</label>
            <Seg
              value={form.initialRegime}
              options={REGIMES}
              getLabel={(r) => (r === 'UP' ? '↑ Up' : r === 'DOWN' ? '↓ Down' : '↔ Range')}
              getActiveClass={regimeActive}
              onChange={(v) => setForm((f) => ({ ...f, initialRegime: v }))}
            />
          </div>
        </div>

        {/* Trigger / Invalidation / Target */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Trigger</label>
          <input
            type="text"
            placeholder="e.g. reclaim VWAP, break OR high"
            value={form.trigger}
            onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
            className={inputClass}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Invalidation</label>
          <input
            type="text"
            placeholder="e.g. close below VWAP, take out prior low"
            value={form.invalidation}
            onChange={(e) => setForm((f) => ({ ...f, invalidation: e.target.value }))}
            className={inputClass}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Target</label>
          <input
            type="text"
            placeholder="e.g. PDH, range high, 2R"
            value={form.decisionTarget}
            onChange={(e) => setForm((f) => ({ ...f, decisionTarget: e.target.value }))}
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* ── Risk plan ── */}
      <div className="flex flex-col gap-3">
        <h3 className={sectionTitleClass}>Risk plan</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Entry</label>
            <input
              type="text"
              placeholder="Price or level"
              value={form.riskEntry}
              onChange={(e) => setForm((f) => ({ ...f, riskEntry: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Stop</label>
            <input
              type="text"
              placeholder="Price or level"
              value={form.riskStop}
              onChange={(e) => setForm((f) => ({ ...f, riskStop: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Target</label>
            <input
              type="text"
              placeholder="Take-profit / exit"
              value={form.riskTarget}
              onChange={(e) => setForm((f) => ({ ...f, riskTarget: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Planned R:R{' '}
          <span className="font-mono tabular-nums text-zinc-300">
            {plannedRR !== null ? `1 : ${plannedRR}` : '—'}
          </span>
          <span className="ml-2 text-zinc-600">(when entry, stop &amp; target are numeric)</span>
        </p>
      </div>

      {/* ── Notes ── */}
      <div className="flex flex-col gap-1.5">
        <label className={labelDimClass}>Notes</label>
        <textarea
          rows={2}
          placeholder="Extra context, levels to watch, sizing…"
          value={form.overallNotes}
          onChange={(e) => setForm((f) => ({ ...f, overallNotes: e.target.value }))}
          className={textareaClass}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded-md bg-indigo-600 px-5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Setup'}
        </button>
      </div>
    </form>
  );
}
