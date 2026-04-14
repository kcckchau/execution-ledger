'use client';

import { useMemo, useState } from 'react';
import {
  type Confirmation,
  type DayType,
  type Direction,
  type EntryTiming,
  type EntryType,
  type Grade,
  type KeyLevel,
  type LiquidityContext,
  type ReviewIntent,
  type SetupType,
  type TradeLocation,
  type TradeSetup,
  type Trigger,
  type MarketOutcome,
  type TradeResult,
  type SetupValidity,
  type MistakeType,
  CONFIRMATIONS,
  CONFIRMATION_LABELS,
  DAY_TYPES,
  DAY_TYPE_LABELS,
  DIRECTIONS,
  ENTRY_TIMINGS,
  ENTRY_TIMING_LABELS,
  ENTRY_TYPES,
  ENTRY_TYPE_LABELS,
  GRADES,
  KEY_LEVELS,
  KEY_LEVEL_LABELS,
  LIQUIDITY_CONTEXTS,
  LIQUIDITY_CONTEXT_LABELS,
  MARKET_OUTCOMES,
  MARKET_OUTCOME_LABELS,
  MISTAKE_TYPES,
  MISTAKE_TYPE_LABELS,
  REVIEW_INTENTS,
  REVIEW_INTENT_LABELS,
  SETUP_TYPES,
  SETUP_TYPE_LABELS,
  SETUP_VALIDITIES,
  SETUP_VALIDITY_LABELS,
  TRADE_RESULTS,
  TRADE_RESULT_LABELS,
  TRADE_LOCATIONS,
  TRADE_LOCATION_LABELS,
  TRIGGERS,
  TRIGGER_LABELS,
} from '@/types/setup';
import { getTodayInEasternTime } from '@/lib/dateUtils';
import { deriveDeprecatedSetupFields } from '@/lib/setupPayload';

interface SetupFormProps {
  onLog: (setup: TradeSetup) => void | Promise<void>;
  onClose: () => void;
  initialSetup?: TradeSetup;
  onSave?: (setup: TradeSetup) => void | Promise<void>;
  defaultValues?: Partial<TradeSetup>;
}

function makeDefaultForm(init?: TradeSetup, defaults?: Partial<TradeSetup>) {
  if (init) {
    return {
      isIdeal: init.isIdeal,
      symbol: init.symbol,
      direction: init.direction,
      setupType: init.setupType,
      setupDate: init.setupDate,
      setupName: init.setupName ?? '',
      initialGrade: (init.initialGrade ?? '') as Grade | '',
      triggers: init.triggers ?? ([] as Trigger[]),
      dayType: (init.dayType ?? '') as DayType | '',
      location: (init.location ?? '') as TradeLocation | '',
      liquidityContext: (init.liquidityContext ?? '') as LiquidityContext | '',
      keyLevels: init.keyLevels ?? ([] as KeyLevel[]),
      entryType: (init.entryType ?? '') as EntryType | '',
      entryTiming: (init.entryTiming ?? '') as EntryTiming | '',
      entryPrice: init.entryPrice != null ? String(init.entryPrice) : '',
      riskStop: init.riskStop,
      riskTarget: init.riskTarget,
      confirmation: init.confirmation ?? ([] as Confirmation[]),
      thesis: init.decisionTarget,
      overallNotes: init.overallNotes,
      intent: (init.intent ?? '') as ReviewIntent | '',
      marketOutcome: (init.marketOutcome ?? '') as MarketOutcome | '',
      tradeResult: (init.tradeResult ?? '') as TradeResult | '',
      setupValidity: (init.setupValidity ?? '') as SetupValidity | '',
      mistakeTypes: init.mistakeTypes ?? ([] as MistakeType[]),
      reviewNote: init.reviewNote ?? '',
    };
  }

  return {
    isIdeal: defaults?.isIdeal ?? false,
    symbol: defaults?.symbol ?? '',
    direction: defaults?.direction ?? ('long' as Direction),
    setupType: defaults?.setupType ?? (SETUP_TYPES[0] as SetupType),
    setupDate: defaults?.setupDate ?? getTodayInEasternTime(),
    setupName: defaults?.setupName ?? '',
    initialGrade: (defaults?.initialGrade ?? '') as Grade | '',
    triggers: defaults?.triggers ?? ([] as Trigger[]),
    dayType: (defaults?.dayType ?? '') as DayType | '',
    location: (defaults?.location ?? '') as TradeLocation | '',
    liquidityContext: (defaults?.liquidityContext ?? '') as LiquidityContext | '',
    keyLevels: defaults?.keyLevels ?? ([] as KeyLevel[]),
    entryType: (defaults?.entryType ?? '') as EntryType | '',
    entryTiming: (defaults?.entryTiming ?? '') as EntryTiming | '',
    entryPrice: defaults?.entryPrice != null ? String(defaults.entryPrice) : '',
    riskStop: defaults?.riskStop ?? '',
    riskTarget: defaults?.riskTarget ?? '',
    confirmation: defaults?.confirmation ?? ([] as Confirmation[]),
    thesis: defaults?.decisionTarget ?? '',
    overallNotes: defaults?.overallNotes ?? '',
    intent: '' as ReviewIntent | '',
    marketOutcome: '' as MarketOutcome | '',
    tradeResult: '' as TradeResult | '',
    setupValidity: '' as SetupValidity | '',
    mistakeTypes: [] as MistakeType[],
    reviewNote: '',
  };
}

const inputClass =
  'h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors';

const textareaClass =
  'rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white resize-none ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors';

const sectionTitleClass =
  'text-[11px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 pb-2';

const labelClass = 'text-xs font-medium text-zinc-400';
const labelDimClass = 'text-xs font-medium text-zinc-500';
const REQ = <span className="text-red-500 ml-0.5">*</span>;

function TagToggle<T extends string>({
  value,
  label,
  selected,
  onToggle,
}: {
  value: T;
  label: string;
  selected: boolean;
  onToggle: (value: T) => void;
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

export default function SetupForm({
  onLog,
  onClose,
  initialSetup,
  onSave,
  defaultValues,
}: SetupFormProps) {
  const isEdit = !!initialSetup;
  const [form, setForm] = useState(() => makeDefaultForm(initialSetup, defaultValues));
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(
    () => form.symbol.trim() !== '' && form.triggers.length > 0,
    [form.symbol, form.triggers],
  );

  function toggleInList<T extends string>(items: T[], value: T): T[] {
    return items.includes(value)
      ? items.filter((item) => item !== value)
      : [...items, value];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entryPriceNumber =
        form.entryPrice.trim() !== '' && Number.isFinite(Number(form.entryPrice))
          ? Number(form.entryPrice)
          : null;
      const tradeResult = form.tradeResult || null;
      const setupValidity = form.setupValidity || null;
      const deprecated = deriveDeprecatedSetupFields({
        triggers: form.triggers,
        dayType: form.dayType || null,
        location: form.location || null,
        keyLevels: form.keyLevels,
        tradeResult,
        setupValidity,
      });

      const shared = {
        isIdeal: form.isIdeal,
        setupDate: form.setupDate,
        symbol: form.symbol.trim().toUpperCase(),
        direction: form.direction,
        setupType: form.setupType,
        triggers: form.triggers,
        dayType: form.dayType || null,
        location: form.location || null,
        liquidityContext: form.liquidityContext || null,
        keyLevels: form.keyLevels,
        entryType: form.entryType || null,
        entryTiming: form.entryTiming || null,
        confirmation: form.confirmation,
        ...deprecated,
        decisionTarget: form.thesis.trim(),
        invalidationType: 'STRUCTURE_BREAK' as const,
        invalidationNote: null,
        riskEntry: form.entryPrice.trim(),
        riskStop: form.riskStop.trim(),
        riskTarget: form.riskTarget.trim(),
        triggerType: null,
        entryPrice: entryPriceNumber,
        stopPrice: null,
        targetPrice: null,
        trueRegime: null,
        vwapState: null,
        structure: null,
        alignment: null,
        mistakeTags: [],
        executionScore: null,
        readScore: null,
        disciplineScore: null,
        bestSetupType: null,
        bestDirection: null,
        shouldTrade: null,
        intent: form.intent || null,
        marketOutcome: form.marketOutcome || null,
        tradeResult,
        setupValidity,
        mistakeTypes: form.mistakeTypes,
        reviewNote: form.reviewNote.trim() || null,
        initialGrade: form.initialGrade || null,
        overallNotes: form.overallNotes.trim(),
        setupName: form.setupName.trim() || null,
      };

      if (isEdit && initialSetup && onSave) {
        await onSave({
          ...initialSetup,
          ...shared,
          updatedAt: now,
        });
      } else {
        await onLog({
          id: crypto.randomUUID(),
          ...shared,
          status: 'open',
          executions: [],
          createdAt: now,
          updatedAt: now,
          dayContext: null,
        });
        setForm(makeDefaultForm(undefined, defaultValues));
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

      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Setup Mode
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isIdeal: false }))}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
              !form.isIdeal
                ? 'bg-zinc-700 text-zinc-100 ring-zinc-500/50'
                : 'bg-zinc-900 text-zinc-500 ring-zinc-700 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
          >
            Executed
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isIdeal: true }))}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
              form.isIdeal
                ? 'bg-violet-900/60 text-violet-300 ring-violet-500/40'
                : 'bg-zinc-900 text-zinc-500 ring-zinc-700 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
          >
            Ideal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Symbol{REQ}</label>
          <input
            type="text"
            value={form.symbol}
            onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
            className={inputClass}
            placeholder="QQQ"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Direction</label>
          <div className="flex h-9 overflow-hidden rounded-md border border-zinc-700">
            {DIRECTIONS.map((direction) => (
              <button
                key={direction}
                type="button"
                onClick={() => setForm((f) => ({ ...f, direction }))}
                className={`flex-1 text-xs font-bold transition-colors ${
                  form.direction === direction
                    ? direction === 'long'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                    : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {direction === 'long' ? '↑ Long' : '↓ Short'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Date</label>
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
            {GRADES.map((grade) => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className={sectionTitleClass}>Thesis / Plan</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Intent</label>
            <select
              value={form.intent}
              onChange={(e) => setForm((f) => ({ ...f, intent: e.target.value as ReviewIntent | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {REVIEW_INTENTS.map((intent) => (
                <option key={intent} value={intent}>{REVIEW_INTENT_LABELS[intent]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelDimClass}>Thesis</label>
            <textarea
              rows={2}
              value={form.thesis}
              onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
              className={textareaClass}
              placeholder="What are you trying to do and why?"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className={sectionTitleClass}>Setup</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Setup Type{REQ}</label>
            <select
              value={form.setupType}
              onChange={(e) => setForm((f) => ({ ...f, setupType: e.target.value as SetupType }))}
              className={inputClass}
            >
              {SETUP_TYPES.map((type) => (
                <option key={type} value={type}>{SETUP_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              Name <span className="text-zinc-600 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.setupName}
              onChange={(e) => setForm((f) => ({ ...f, setupName: e.target.value }))}
              className={inputClass}
              placeholder="Morning failed move"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Triggers{REQ}</label>
          <div className="flex flex-wrap gap-2">
            {TRIGGERS.map((trigger) => (
              <TagToggle
                key={trigger}
                value={trigger}
                label={TRIGGER_LABELS[trigger]}
                selected={form.triggers.includes(trigger)}
                onToggle={(value) =>
                  setForm((f) => ({ ...f, triggers: toggleInList(f.triggers, value) }))
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className={sectionTitleClass}>Context</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Day Type</label>
            <select
              value={form.dayType}
              onChange={(e) => setForm((f) => ({ ...f, dayType: e.target.value as DayType | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {DAY_TYPES.map((dayType) => (
                <option key={dayType} value={dayType}>{DAY_TYPE_LABELS[dayType]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Location</label>
            <select
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value as TradeLocation | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {TRADE_LOCATIONS.map((location) => (
                <option key={location} value={location}>{TRADE_LOCATION_LABELS[location]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Liquidity</label>
            <select
              value={form.liquidityContext}
              onChange={(e) =>
                setForm((f) => ({ ...f, liquidityContext: e.target.value as LiquidityContext | '' }))
              }
              className={inputClass}
            >
              <option value="">—</option>
              {LIQUIDITY_CONTEXTS.map((value) => (
                <option key={value} value={value}>{LIQUIDITY_CONTEXT_LABELS[value]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Key Levels <span className="text-zinc-600 font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {KEY_LEVELS.map((level) => (
              <TagToggle
                key={level}
                value={level}
                label={KEY_LEVEL_LABELS[level]}
                selected={form.keyLevels.includes(level)}
                onToggle={(value) =>
                  setForm((f) => ({ ...f, keyLevels: toggleInList(f.keyLevels, value) }))
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className={sectionTitleClass}>Execution</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Entry Type</label>
            <select
              value={form.entryType}
              onChange={(e) => setForm((f) => ({ ...f, entryType: e.target.value as EntryType | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {ENTRY_TYPES.map((entryType) => (
                <option key={entryType} value={entryType}>{ENTRY_TYPE_LABELS[entryType]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Entry Timing</label>
            <select
              value={form.entryTiming}
              onChange={(e) => setForm((f) => ({ ...f, entryTiming: e.target.value as EntryTiming | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {ENTRY_TIMINGS.map((entryTiming) => (
                <option key={entryTiming} value={entryTiming}>{ENTRY_TIMING_LABELS[entryTiming]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className={sectionTitleClass}>Entry</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Entry Price</label>
            <input
              type="number"
              step="0.01"
              value={form.entryPrice}
              onChange={(e) => setForm((f) => ({ ...f, entryPrice: e.target.value }))}
              className={inputClass}
              placeholder="610.75"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Stop</label>
            <input
              type="text"
              value={form.riskStop}
              onChange={(e) => setForm((f) => ({ ...f, riskStop: e.target.value }))}
              className={inputClass}
              placeholder="609.90"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Target</label>
            <input
              type="text"
              value={form.riskTarget}
              onChange={(e) => setForm((f) => ({ ...f, riskTarget: e.target.value }))}
              className={inputClass}
              placeholder="612.50"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className={sectionTitleClass}>Confirmation</h3>
        <div className="flex flex-wrap gap-2">
          {CONFIRMATIONS.map((value) => (
            <TagToggle
              key={value}
              value={value}
              label={CONFIRMATION_LABELS[value]}
              selected={form.confirmation.includes(value)}
              onToggle={(confirmation) =>
                setForm((f) => ({ ...f, confirmation: toggleInList(f.confirmation, confirmation) }))
              }
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className={sectionTitleClass}>Notes</h3>
        <div className="flex flex-col gap-1.5">
          <label className={labelDimClass}>Extra Notes</label>
          <textarea
            rows={2}
            value={form.overallNotes}
            onChange={(e) => setForm((f) => ({ ...f, overallNotes: e.target.value }))}
            className={textareaClass}
            placeholder="Context, reminders, sizing notes"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className={sectionTitleClass}>Review</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Market Outcome</label>
            <select
              value={form.marketOutcome}
              onChange={(e) => setForm((f) => ({ ...f, marketOutcome: e.target.value as MarketOutcome | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {MARKET_OUTCOMES.map((value) => (
                <option key={value} value={value}>{MARKET_OUTCOME_LABELS[value]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Trade Result</label>
            <select
              value={form.tradeResult}
              onChange={(e) => setForm((f) => ({ ...f, tradeResult: e.target.value as TradeResult | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {TRADE_RESULTS.map((value) => (
                <option key={value} value={value}>{TRADE_RESULT_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Setup Validity</label>
            <select
              value={form.setupValidity}
              onChange={(e) => setForm((f) => ({ ...f, setupValidity: e.target.value as SetupValidity | '' }))}
              className={inputClass}
            >
              <option value="">—</option>
              {SETUP_VALIDITIES.map((value) => (
                <option key={value} value={value}>{SETUP_VALIDITY_LABELS[value]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Mistakes</label>
          <div className="flex flex-wrap gap-2">
            {MISTAKE_TYPES.map((value) => (
              <TagToggle
                key={value}
                value={value}
                label={MISTAKE_TYPE_LABELS[value]}
                selected={form.mistakeTypes.includes(value)}
                onToggle={(mistakeType) =>
                  setForm((f) => ({ ...f, mistakeTypes: toggleInList(f.mistakeTypes, mistakeType) }))
                }
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Review Note</label>
          <textarea
            rows={2}
            value={form.reviewNote}
            onChange={(e) => setForm((f) => ({ ...f, reviewNote: e.target.value }))}
            className={textareaClass}
            placeholder="What confirmed or invalidated the read?"
          />
        </div>
      </div>

      {!canSave && (
        <p className="text-xs text-zinc-600">
          Required: symbol and at least one trigger.
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
