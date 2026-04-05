'use client';

import { useState } from 'react';
import {
  REGIMES, REGIME_LABELS,
  VWAP_STATES, VWAP_STATE_LABELS,
  DAY_TYPES, DAY_TYPE_LABELS,
  STRUCTURE_TYPES, STRUCTURE_TYPE_LABELS,
  SETUP_TYPES, SETUP_TYPE_LABELS,
  TRIGGER_TYPES, TRIGGER_TYPE_LABELS,
  ALIGNMENTS, ALIGNMENT_LABELS,
  OUTCOME_TYPES, OUTCOME_TYPE_LABELS,
  MISS_REASONS, MISS_REASON_LABELS,
  type Regime, type VWAPState, type DayType, type StructureType,
  type SetupType, type TriggerType, type Alignment,
  type OutcomeType, type MissReason,
} from '@/types/setup';
import type { MarketOpportunity, CreateOpportunityInput, OpportunityDirection } from '@/types/opportunity';

interface OpportunityFormProps {
  /** YYYY-MM-DD */
  date: string;
  initial?: MarketOpportunity;
  onSave: (input: CreateOpportunityInput) => Promise<void>;
  onCancel: () => void;
}

const inputClass =
  'h-8 rounded border border-zinc-700 bg-zinc-800 px-2 text-xs text-white ' +
  'focus:outline-none focus:border-indigo-500 transition-colors';

const selectClass = inputClass;

function SegRow<T extends string>({
  label,
  value,
  options,
  getLabel,
  onChange,
  required,
}: {
  label: string;
  value: T | null;
  options: readonly T[];
  getLabel: (v: T) => string;
  onChange: (v: T | null) => void;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <div className="flex h-6 overflow-hidden rounded border border-zinc-700">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(value === o ? (required ? value : null) : o)}
            className={`flex-1 truncate px-1 text-[10px] font-medium transition-colors ${
              value === o
                ? 'bg-indigo-700/70 text-indigo-100'
                : 'bg-zinc-900 text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {getLabel(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OpportunityForm({ date, initial, onSave, onCancel }: OpportunityFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    symbol: string;
    trueRegime: Regime | null;
    vwapState: VWAPState | null;
    dayType: DayType | null;
    structure: StructureType | null;
    setupType: SetupType | null;
    triggerType: TriggerType | null;
    direction: OpportunityDirection | null;
    alignment: Alignment | null;
    outcome: OutcomeType | null;
    taken: boolean;
    missReason: MissReason | null;
    notes: string;
    qualityScore: string;
    isAPlus: boolean | null;
  }>({
    symbol:      initial?.symbol ?? '',
    trueRegime:  (initial?.trueRegime as Regime) ?? null,
    vwapState:   (initial?.vwapState as VWAPState) ?? null,
    dayType:     (initial?.dayType as DayType) ?? null,
    structure:   (initial?.structure as StructureType) ?? null,
    setupType:   (initial?.setupType as SetupType) ?? null,
    triggerType: (initial?.triggerType as TriggerType | null) ?? null,
    direction:   (initial?.direction as OpportunityDirection) ?? null,
    alignment:   (initial?.alignment as Alignment | null) ?? null,
    outcome:     (initial?.outcome as OutcomeType | null) ?? null,
    taken:       initial?.taken ?? false,
    missReason:  (initial?.missReason as MissReason | null) ?? null,
    notes:       initial?.notes ?? '',
    qualityScore: initial?.qualityScore?.toString() ?? '',
    isAPlus:     initial?.isAPlus ?? null,
  });

  const isValid =
    form.symbol.trim() &&
    form.trueRegime &&
    form.vwapState &&
    form.dayType &&
    form.structure &&
    form.setupType &&
    form.direction;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave({
        symbol: form.symbol.trim().toUpperCase(),
        date,
        trueRegime: form.trueRegime!,
        vwapState: form.vwapState!,
        dayType: form.dayType!,
        structure: form.structure!,
        setupType: form.setupType!,
        triggerType: form.triggerType,
        direction: form.direction!,
        alignment: form.alignment,
        outcome: form.outcome,
        maxFavorable: null,
        maxAdverse: null,
        taken: form.taken,
        missReason: form.taken ? null : form.missReason,
        notes: form.notes.trim() || null,
        qualityScore: form.qualityScore ? parseInt(form.qualityScore) : null,
        isAPlus: form.isAPlus,
      });
    } finally {
      setSaving(false);
    }
  }

  const f = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300">
          {initial ? 'Edit Opportunity' : 'Log Opportunity'}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Symbol + Direction */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
            Symbol <span className="text-rose-500">*</span>
          </span>
          <input
            className={inputClass}
            placeholder="AAPL"
            value={form.symbol}
            onChange={(e) => f('symbol', e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
            Direction <span className="text-rose-500">*</span>
          </span>
          <div className="flex h-8 overflow-hidden rounded border border-zinc-700">
            {(['LONG', 'SHORT'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => f('direction', form.direction === d ? null : d)}
                className={`flex-1 text-xs font-bold transition-colors ${
                  form.direction === d
                    ? d === 'LONG'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                    : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {d === 'LONG' ? '↑ Long' : '↓ Short'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Market state — required */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SegRow label="Regime" value={form.trueRegime} options={REGIMES}
          getLabel={(r) => REGIME_LABELS[r]} onChange={(v) => f('trueRegime', v)} required />
        <SegRow label="VWAP state" value={form.vwapState} options={VWAP_STATES}
          getLabel={(v) => VWAP_STATE_LABELS[v]} onChange={(v) => f('vwapState', v)} required />
        <SegRow label="Day type" value={form.dayType} options={DAY_TYPES}
          getLabel={(d) => DAY_TYPE_LABELS[d]} onChange={(v) => f('dayType', v)} required />
        <SegRow label="Structure" value={form.structure} options={STRUCTURE_TYPES}
          getLabel={(s) => STRUCTURE_TYPE_LABELS[s]} onChange={(v) => f('structure', v)} required />
      </div>

      {/* Setup classification */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
            Setup type <span className="text-rose-500">*</span>
          </span>
          <select
            className={selectClass}
            value={form.setupType ?? ''}
            onChange={(e) => f('setupType', e.target.value as SetupType || null)}
            required
          >
            <option value="">—</option>
            {SETUP_TYPES.map((s) => (
              <option key={s} value={s}>{SETUP_TYPE_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Trigger</span>
          <select
            className={selectClass}
            value={form.triggerType ?? ''}
            onChange={(e) => f('triggerType', e.target.value as TriggerType || null)}
          >
            <option value="">—</option>
            {TRIGGER_TYPES.map((t) => (
              <option key={t} value={t}>{TRIGGER_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alignment + outcome */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SegRow label="Alignment" value={form.alignment}
          options={['WITH_TREND', 'COUNTER', 'NEUTRAL'] as const}
          getLabel={(a) => ALIGNMENT_LABELS[a]} onChange={(v) => f('alignment', v as Alignment | null)} />
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Outcome</span>
          <select
            className={selectClass}
            value={form.outcome ?? ''}
            onChange={(e) => f('outcome', e.target.value as OutcomeType || null)}
          >
            <option value="">—</option>
            {OUTCOME_TYPES.map((o) => (
              <option key={o} value={o}>{OUTCOME_TYPE_LABELS[o]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Taken + miss reason */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.taken}
            onChange={(e) => f('taken', e.target.checked)}
            className="h-3.5 w-3.5 accent-indigo-500"
          />
          <span className="text-xs text-zinc-300">I took this trade</span>
        </label>
        {!form.taken && (
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Miss reason</span>
            <select
              className={selectClass}
              value={form.missReason ?? ''}
              onChange={(e) => f('missReason', e.target.value as MissReason || null)}
            >
              <option value="">—</option>
              {MISS_REASONS.map((r) => (
                <option key={r} value={r}>{MISS_REASON_LABELS[r]}</option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isAPlus === true}
            onChange={(e) => f('isAPlus', e.target.checked ? true : null)}
            className="h-3.5 w-3.5 accent-amber-500"
          />
          <span className="text-xs text-zinc-300">A+ setup</span>
        </label>
      </div>

      {/* Notes */}
      <textarea
        rows={2}
        placeholder="Notes…"
        value={form.notes}
        onChange={(e) => f('notes', e.target.value)}
        className="resize-none rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isValid || saving}
          className="h-8 rounded bg-indigo-600 px-4 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Save' : 'Log'}
        </button>
      </div>
    </form>
  );
}
