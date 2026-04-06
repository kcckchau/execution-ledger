'use client';

import { useMemo, useState } from 'react';
import {
  type TradeSetup,
  type SetupType,
  type Grade,
  type Direction,
  type Context,
  type Location,
  type EntryTrigger,
  SETUP_TYPES,
  SETUP_TYPE_LABELS,
  GRADES,
  DIRECTIONS,
  CONTEXTS,
  CONTEXT_LABELS,
  LOCATIONS,
  LOCATION_LABELS,
  ENTRY_TRIGGERS,
  ENTRY_TRIGGER_LABELS,
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
      setupName: init.setupName ?? '',
      // 4-part classification
      contexts: init.contexts ?? ([] as Context[]),
      locations: init.locations ?? ([] as Location[]),
      entryTrigger: init.entryTrigger ?? ('' as EntryTrigger | ''),
    };
  }
  return {
    symbol: '',
    direction: 'long' as Direction,
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
    setupName: '',
    // 4-part classification
    contexts: [] as Context[],
    locations: [] as Location[],
    entryTrigger: '' as EntryTrigger | '',
  };
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
const labelDimClass = 'text-xs font-medium text-zinc-500';

// ── Tag toggle component ──────────────────────────────────────────────────────

function TagToggle<T extends string>({
  value,
  label,
  selected,
  onToggle,
}: {
  value: T;
  label: string;
  selected: boolean;
  onToggle: (v: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        selected
          ? 'bg-indigo-600 text-white ring-1 ring-indigo-400/50'
          : 'bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SetupForm({ onLog, onClose, initialSetup, onSave }: SetupFormProps) {
  const isEdit = !!initialSetup;
  const [form, setForm] = useState(() => makeDefaultForm(initialSetup));
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const plannedRR = useMemo(
    () => formatPlannedRiskReward(form.riskEntry, form.riskStop, form.riskTarget, form.direction),
    [form.riskEntry, form.riskStop, form.riskTarget, form.direction]
  );

  function toggleContext(ctx: Context) {
    setForm((f) => ({
      ...f,
      contexts: f.contexts.includes(ctx)
        ? f.contexts.filter((c) => c !== ctx)
        : [...f.contexts, ctx],
    }));
  }

  function toggleLocation(loc: Location) {
    setForm((f) => ({
      ...f,
      locations: f.locations.includes(loc)
        ? f.locations.filter((l) => l !== loc)
        : [...f.locations, loc],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!form.symbol.trim() || !form.invalidation.trim() || !form.decisionTarget.trim()) {
      return;
    }
    if (form.contexts.length === 0) {
      setValidationError('Select at least one Context — this is required for win-rate analysis.');
      return;
    }
    if (!form.entryTrigger) {
      setValidationError('Entry trigger is required.');
      return;
    }
    // Cross-field rule: RANGE_REJECT cannot occur at MID_RANGE
    if (
      form.setupType === 'RANGE_REJECT' &&
      form.locations.includes('MID_RANGE')
    ) {
      setValidationError('RANGE_REJECT cannot occur at MID_RANGE — rejections happen at range extremes.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();

      if (isEdit && initialSetup && onSave) {
        await onSave({
          ...initialSetup,
          setupDate: form.setupDate,
          symbol: form.symbol.trim().toUpperCase(),
          direction: form.direction,
          setupType: form.setupType,
          trigger: form.trigger.trim(),
          invalidation: form.invalidation.trim(),
          decisionTarget: form.decisionTarget.trim(),
          riskEntry: form.riskEntry.trim(),
          riskStop: form.riskStop.trim(),
          riskTarget: form.riskTarget.trim(),
          initialGrade: (form.initialGrade as Grade) || null,
          overallNotes: form.overallNotes.trim(),
          setupName: form.setupName.trim() || null,
          // 4-part classification
          contexts: form.contexts,
          locations: form.locations,
          entryTrigger: (form.entryTrigger as EntryTrigger) || null,
          updatedAt: now,
        });
      } else {
        onLog({
          id: crypto.randomUUID(),
          setupDate: form.setupDate,
          symbol: form.symbol.trim().toUpperCase(),
          direction: form.direction,
          setupType: form.setupType,
          trigger: form.trigger.trim(),
          invalidation: form.invalidation.trim(),
          decisionTarget: form.decisionTarget.trim(),
          riskEntry: form.riskEntry.trim(),
          riskStop: form.riskStop.trim(),
          riskTarget: form.riskTarget.trim(),
          // 4-part classification
          contexts: form.contexts,
          locations: form.locations,
          entryTrigger: (form.entryTrigger as EntryTrigger) || null,
          // Layer 1 structured
          triggerType: null,
          entryPrice: null,
          stopPrice: null,
          targetPrice: null,
          // Layer 2
          trueRegime: null,
          vwapState: null,
          structure: null,
          alignment: null,
          // Layer 3
          mistakeTags: [],
          executionScore: null,
          readScore: null,
          disciplineScore: null,
          bestSetupType: null,
          bestDirection: null,
          shouldTrade: null,
          initialGrade: (form.initialGrade as Grade) || null,
          status: 'open',
          overallNotes: form.overallNotes.trim(),
          setupName: form.setupName.trim() || null,
          review: null,
          executions: [],
          createdAt: now,
          updatedAt: now,
          dayContext: null,
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

      {/* ── 4-Part Classification ── */}
      <div className="flex flex-col gap-4">
        <h3 className={sectionTitleClass}>Classification</h3>

        {/* Setup type — WHY */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Setup <span className="text-zinc-600 font-normal">— WHY you&apos;re in this trade</span>
          </label>
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

        {/* Context — WHEN it works */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Context <span className="text-red-500">*</span>{' '}
            <span className="text-zinc-600 font-normal">— WHEN it works (pick all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CONTEXTS.map((ctx) => (
              <TagToggle
                key={ctx}
                value={ctx}
                label={CONTEXT_LABELS[ctx]}
                selected={form.contexts.includes(ctx)}
                onToggle={toggleContext}
              />
            ))}
          </div>
        </div>

        {/* Location — WHERE */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Location <span className="text-zinc-600 font-normal">— WHERE (price levels in play)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map((loc) => (
              <TagToggle
                key={loc}
                value={loc}
                label={LOCATION_LABELS[loc]}
                selected={form.locations.includes(loc)}
                onToggle={toggleLocation}
              />
            ))}
          </div>
        </div>

        {/* Entry trigger — execution timing */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Entry Trigger <span className="text-red-500">*</span>{' '}
            <span className="text-zinc-600 font-normal">— execution timing signal</span>
          </label>
          <select
            value={form.entryTrigger}
            onChange={(e) => setForm((f) => ({ ...f, entryTrigger: e.target.value as EntryTrigger | '' }))}
            className={inputClass}
          >
            <option value="">Select trigger…</option>
            {ENTRY_TRIGGERS.map((t) => (
              <option key={t} value={t}>{ENTRY_TRIGGER_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Trade plan ── */}
      <div className="flex flex-col gap-3">
        <h3 className={sectionTitleClass}>Trade plan</h3>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Trigger <span className="text-zinc-600 font-normal">(description)</span></label>
          <input
            type="text"
            placeholder="e.g. reclaim VWAP on volume, break OR high"
            value={form.trigger}
            onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Invalidation <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            placeholder="e.g. close below VWAP, take out prior low"
            value={form.invalidation}
            onChange={(e) => setForm((f) => ({ ...f, invalidation: e.target.value }))}
            className={textareaClass}
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

      {/* ── Notes + optional name ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelDimClass}>Name <span className="text-zinc-600 font-normal">(optional — shown in chart toggle)</span></label>
          <input
            type="text"
            placeholder="e.g. Morning VWAP play"
            value={form.setupName}
            onChange={(e) => setForm((f) => ({ ...f, setupName: e.target.value }))}
            className={inputClass}
          />
        </div>
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
      </div>

      {/* ── Validation error ── */}
      {validationError && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/30">
          {validationError}
        </p>
      )}

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
