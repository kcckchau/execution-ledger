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
  type InvalidationType,
  type Outcome,
  type SetupResult,
  type MistakeType,
  type MarketOutcome,
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
  INVALIDATION_TYPES,
  INVALIDATION_TYPE_LABELS,
  OUTCOMES,
  OUTCOME_LABELS,
  SETUP_RESULTS,
  SETUP_RESULT_LABELS,
  MISTAKE_TYPES,
  MISTAKE_TYPE_LABELS,
  MARKET_OUTCOMES,
  MARKET_OUTCOME_LABELS,
} from '@/types/setup';
import { getTodayInEasternTime } from '@/lib/dateUtils';
import { formatPlannedRiskReward } from '@/lib/plannedRiskReward';

interface SetupFormProps {
  onLog: (setup: TradeSetup) => void;
  onClose: () => void;
  initialSetup?: TradeSetup;
  onSave?: (setup: TradeSetup) => void;
}

function makeDefaultForm(init?: TradeSetup) {
  if (init) {
    return {
      isIdeal:         init.isIdeal,
      symbol:          init.symbol,
      direction:       init.direction,
      setupType:       init.setupType,
      setupDate:       init.setupDate,
      setupName:       init.setupName ?? '',
      initialGrade:    (init.initialGrade ?? '') as Grade | '',
      // Classification
      contexts:        init.contexts ?? ([] as Context[]),
      locations:       init.locations ?? ([] as Location[]),
      entryTrigger:    init.entryTrigger ?? ('' as EntryTrigger | ''),
      // Trade Plan
      thesis:          init.decisionTarget,
      invalidationType: init.invalidationType ?? ('' as InvalidationType | ''),
      invalidationNote: init.invalidationNote ?? '',
      // Review layer
      outcome:       (init.outcome ?? '') as Outcome | '',
      setupResult:   (init.setupResult ?? '') as SetupResult | '',
      mistakeTypes:  init.mistakeTypes ?? ([] as MistakeType[]),
      marketOutcome: (init.marketOutcome ?? '') as MarketOutcome | '',
      reviewNote:    init.reviewNote ?? '',
      riskEntry:       init.riskEntry,
      riskStop:        init.riskStop,
      riskTarget:      init.riskTarget,
      overallNotes:    init.overallNotes,
    };
  }
  return {
    isIdeal:         false,
    symbol:          '',
    direction:       'long' as Direction,
    setupType:       SETUP_TYPES[0] as SetupType,
    setupDate:       getTodayInEasternTime(),
    setupName:       '',
    initialGrade:    '' as Grade | '',
    // Classification
    contexts:        [] as Context[],
    locations:       [] as Location[],
    entryTrigger:    '' as EntryTrigger | '',
    // Trade Plan
    thesis:          '',
    invalidationType: '' as InvalidationType | '',
    invalidationNote: '',
    // Review layer
    outcome:       '' as Outcome | '',
    setupResult:   '' as SetupResult | '',
    mistakeTypes:  [] as MistakeType[],
    marketOutcome: '' as MarketOutcome | '',
    reviewNote:    '',
    riskEntry:       '',
    riskStop:        '',
    riskTarget:      '',
    overallNotes:    '',
  };
}

// ── Style tokens ──────────────────────────────────────────────────────────────

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

const REQ = <span className="text-red-500 ml-0.5">*</span>;

// ── Tag toggle ────────────────────────────────────────────────────────────────

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

  // ── Derived validity (disable Save reactively) ────────────────────────────
  const canSave = useMemo(
    () =>
      form.symbol.trim() !== '' &&
      form.entryTrigger !== '' &&
      form.contexts.length > 0 &&
      form.thesis.trim() !== '' &&
      form.invalidationType !== '',
    [form.symbol, form.entryTrigger, form.contexts, form.thesis, form.invalidationType]
  );

  // ── Non-blocking warnings (live) ─────────────────────────────────────────
  const warnings = useMemo(() => {
    const msgs: string[] = [];

    if (
      (form.setupType === 'VWAP_REJECT' || form.setupType === 'VWAP_RECLAIM') &&
      !form.locations.includes('VWAP')
    ) {
      msgs.push(`${SETUP_TYPE_LABELS[form.setupType]} usually trades at VWAP — consider adding VWAP to Locations.`);
    }

    if (form.setupType === 'RANGE_REJECT' && form.locations.includes('MID_RANGE')) {
      msgs.push('RANGE_REJECT at MID_RANGE is unusual — rejections happen at range extremes.');
    }

    if (
      form.invalidationType === 'STRUCTURE_BREAK' &&
      /vwap/i.test(form.invalidationNote)
    ) {
      msgs.push('Your note mentions VWAP — consider using Reclaim VWAP or Hold Above/Below VWAP as the invalidation type.');
    }

    return msgs;
  }, [form.setupType, form.locations, form.invalidationType, form.invalidationNote]);

  // ── R:R ───────────────────────────────────────────────────────────────────
  const plannedRR = useMemo(
    () => formatPlannedRiskReward(form.riskEntry, form.riskStop, form.riskTarget, form.direction),
    [form.riskEntry, form.riskStop, form.riskTarget, form.direction]
  );

  // ── Tag toggles ───────────────────────────────────────────────────────────
  function toggleContext(ctx: Context) {
    setForm((f) => ({
      ...f,
      contexts: f.contexts.includes(ctx) ? f.contexts.filter((c) => c !== ctx) : [...f.contexts, ctx],
    }));
  }
  function toggleLocation(loc: Location) {
    setForm((f) => ({
      ...f,
      locations: f.locations.includes(loc) ? f.locations.filter((l) => l !== loc) : [...f.locations, loc],
    }));
  }

  function toggleMistakeType(m: MistakeType) {
    setForm((f) => ({
      ...f,
      mistakeTypes: f.mistakeTypes.includes(m)
        ? f.mistakeTypes.filter((x) => x !== m)
        : [...f.mistakeTypes, m],
    }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const shared = {
        isIdeal:          form.isIdeal,
        setupDate:        form.setupDate,
        symbol:           form.symbol.trim().toUpperCase(),
        direction:        form.direction,
        setupType:        form.setupType,
        // Classification — structured trigger stored in entryTrigger; legacy text field left blank
        trigger:          '',
        decisionTarget:   form.thesis.trim(),
        contexts:         form.contexts,
        locations:        form.locations,
        entryTrigger:     (form.entryTrigger as EntryTrigger) || null,
        // Trade Plan
        invalidationType: form.invalidationType as InvalidationType,
        invalidationNote: form.invalidationNote.trim() || null,
        riskEntry:        form.riskEntry.trim(),
        riskStop:         form.riskStop.trim(),
        riskTarget:       form.riskTarget.trim(),
        initialGrade:     (form.initialGrade as Grade) || null,
        overallNotes:     form.overallNotes.trim(),
        setupName:        form.setupName.trim() || null,
        // Review layer
        outcome:       (form.outcome as Outcome) || null,
        setupResult:   (form.setupResult as SetupResult) || null,
        mistakeTypes:  form.mistakeTypes,
        marketOutcome: (form.marketOutcome as MarketOutcome) || null,
        reviewNote:    form.reviewNote.trim() || null,
      };

      if (isEdit && initialSetup && onSave) {
        await onSave({ ...initialSetup, ...shared, updatedAt: now });
      } else {
        onLog({
          id:              crypto.randomUUID(),
          ...shared,
          // Layer 1 structured (not yet wired in form)
          triggerType:     null,
          entryPrice:      null,
          stopPrice:       null,
          targetPrice:     null,
          // Layer 2
          trueRegime:      null,
          vwapState:       null,
          structure:       null,
          alignment:       null,
          // Layer 3
          mistakeTags:     [],
          executionScore:  null,
          readScore:       null,
          disciplineScore: null,
          bestSetupType:   null,
          bestDirection:   null,
          shouldTrade:     null,
          // Review layer
          outcome:       null,
          setupResult:   null,
          mistakeTypes:  [],
          marketOutcome: null,
          reviewNote:    null,
          status:          'open',
          executions:      [],
          createdAt:       now,
          updatedAt:       now,
          dayContext:      null,
        });
        setForm(makeDefaultForm());
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
    >
      {/* Title */}
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

      {/* ── Tracking mode ── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Setup Mode
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isIdeal: false }))}
            aria-pressed={!form.isIdeal}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
              !form.isIdeal
                ? 'bg-zinc-700 text-zinc-100 ring-zinc-500/50'
                : 'bg-zinc-900 text-zinc-500 ring-zinc-700 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
          >
            Executed (counts in P&amp;L)
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isIdeal: true }))}
            aria-pressed={form.isIdeal}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
              form.isIdeal
                ? 'bg-violet-900/60 text-violet-300 ring-violet-500/40'
                : 'bg-zinc-900 text-zinc-500 ring-zinc-700 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
          >
            Ideal (review only)
          </button>
        </div>
        <p className="text-[10px] text-zinc-500">
          Ideal setups are hypothetical; their P&amp;L is shown separately (violet) from executed trades in the log, calendar, and filters.
        </p>
      </div>

      {/* ── Identity row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Symbol{REQ}</label>
          <input
            type="text"
            placeholder="AAPL"
            value={form.symbol}
            onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
            className={inputClass}
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
            Date <span className="font-normal text-zinc-600">(ET)</span>
          </label>
          <input
            type="date"
            value={form.setupDate}
            onChange={(e) => setForm((f) => ({ ...f, setupDate: e.target.value }))}
            className={inputClass}
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

      {/* ── Classification ── */}
      <div className="flex flex-col gap-4">
        <h3 className={sectionTitleClass}>Classification</h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Setup type */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              Setup{REQ}{' '}
              <span className="text-zinc-600 font-normal">— WHY</span>
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

          {/* Trigger */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              Trigger{REQ}{' '}
              <span className="text-zinc-600 font-normal">— execution signal</span>
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

        {/* Context */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Context{REQ}{' '}
            <span className="text-zinc-600 font-normal">— WHEN it works</span>
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

        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Location{' '}
            <span className="text-zinc-600 font-normal">— WHERE (price levels in play)</span>
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
      </div>

      {/* ── Trade Plan ── */}
      <div className="flex flex-col gap-3">
        <h3 className={sectionTitleClass}>Trade Plan</h3>

        {/* Thesis */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Thesis{REQ}{' '}
            <span className="text-zinc-600 font-normal">— what needs to happen</span>
          </label>
          <textarea
            rows={2}
            placeholder="e.g. reclaim VWAP on volume, hold above and target PDH"
            value={form.thesis}
            onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
            className={textareaClass}
          />
        </div>

        {/* Invalidation */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Invalidation Type{REQ}</label>
            <select
              value={form.invalidationType}
              onChange={(e) => setForm((f) => ({ ...f, invalidationType: e.target.value as InvalidationType | '' }))}
              className={inputClass}
            >
              <option value="">Select condition…</option>
              {INVALIDATION_TYPES.map((t) => (
                <option key={t} value={t}>{INVALIDATION_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              Invalidation Note{' '}
              <span className="text-zinc-600 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. break AH high with acceptance"
              value={form.invalidationNote}
              onChange={(e) => setForm((f) => ({ ...f, invalidationNote: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        {/* Entry / Stop / Target */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Entry <span className="text-zinc-600 font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="Price or level"
              value={form.riskEntry}
              onChange={(e) => setForm((f) => ({ ...f, riskEntry: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Stop <span className="text-zinc-600 font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="Price or level"
              value={form.riskStop}
              onChange={(e) => setForm((f) => ({ ...f, riskStop: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Target <span className="text-zinc-600 font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="Take-profit / exit"
              value={form.riskTarget}
              onChange={(e) => setForm((f) => ({ ...f, riskTarget: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        {/* Planned R:R */}
        <p className="text-xs text-zinc-500">
          Planned R:R{' '}
          <span className="font-mono tabular-nums text-zinc-300">
            {plannedRR !== null ? `1 : ${plannedRR}` : '—'}
          </span>
          <span className="ml-2 text-zinc-600">(computed when entry, stop &amp; target are numeric)</span>
        </p>

        {/* Notes + Name */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelDimClass}>
              Notes <span className="text-zinc-600 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Extra context, levels to watch, sizing…"
              value={form.overallNotes}
              onChange={(e) => setForm((f) => ({ ...f, overallNotes: e.target.value }))}
              className={textareaClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelDimClass}>
              Name <span className="text-zinc-600 font-normal">(optional — shown in chart toggle)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Morning VWAP play"
              value={form.setupName}
              onChange={(e) => setForm((f) => ({ ...f, setupName: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Review ── */}
      <div className="flex flex-col gap-3">
        <h3 className={sectionTitleClass}>
          Review{' '}
          <span className="font-normal normal-case text-zinc-600 tracking-normal">— fill after trade closes</span>
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Outcome */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Outcome</label>
            <select
              value={form.outcome}
              onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value as Outcome | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>
              ))}
            </select>
          </div>

          {/* Setup Result */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Setup Result</label>
            <select
              value={form.setupResult}
              onChange={(e) => setForm((f) => ({ ...f, setupResult: e.target.value as SetupResult | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {SETUP_RESULTS.map((r) => (
                <option key={r} value={r}>{SETUP_RESULT_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {/* Market Outcome */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Market Outcome</label>
            <select
              value={form.marketOutcome}
              onChange={(e) => setForm((f) => ({ ...f, marketOutcome: e.target.value as MarketOutcome | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {MARKET_OUTCOMES.map((m) => (
                <option key={m} value={m}>{MARKET_OUTCOME_LABELS[m]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mistake Types */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Mistakes{' '}
            <span className="text-zinc-600 font-normal">(optional — pick all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MISTAKE_TYPES.map((m) => (
              <TagToggle
                key={m}
                value={m}
                label={MISTAKE_TYPE_LABELS[m]}
                selected={form.mistakeTypes.includes(m)}
                onToggle={toggleMistakeType}
              />
            ))}
          </div>
        </div>

        {/* Review Note */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Review Note{' '}
            <span className="text-zinc-600 font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="What happened? What would you do differently?"
            value={form.reviewNote}
            onChange={(e) => setForm((f) => ({ ...f, reviewNote: e.target.value }))}
            className={textareaClass}
          />
        </div>
      </div>

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {warnings.map((w) => (
            <p
              key={w}
              className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-400 ring-1 ring-amber-500/30"
            >
              {w}
            </p>
          ))}
        </div>
      )}

      {/* ── Required fields hint ── */}
      {!canSave && (
        <p className="text-xs text-zinc-600">
          Required: symbol, setup, trigger, at least one context, thesis, invalidation type.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !canSave}
          className="h-9 rounded-md bg-indigo-600 px-5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Setup'}
        </button>
      </div>
    </form>
  );
}
