'use client';

import { useState } from 'react';
import {
  type TradeSetup,
  type SetupType,
  type Grade,
  type Direction,
  SETUP_TYPES,
  GRADES,
  DIRECTIONS,
} from '@/types/setup';
import { getTodayInEasternTime } from '@/lib/dateUtils';

interface SetupFormProps {
  onLog: (setup: TradeSetup) => void;
  onClose: () => void;
}

function makeDefaultForm() {
  return {
    symbol: '',
    direction: 'long' as Direction,
    setupType: SETUP_TYPES[0] as SetupType,
    thesis: '',
    initialGrade: '' as Grade | '',
    overallNotes: '',
    setupDate: getTodayInEasternTime(),
  };
}

const inputClass =
  'h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors';

const textareaClass =
  'rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white resize-none ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors';

export default function SetupForm({ onLog, onClose }: SetupFormProps) {
  const [form, setForm] = useState(makeDefaultForm);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol.trim() || !form.thesis.trim()) return;

    const now = new Date().toISOString();
    onLog({
      id: crypto.randomUUID(),
      setupDate: form.setupDate,
      symbol: form.symbol.trim().toUpperCase(),
      direction: form.direction,
      setupType: form.setupType,
      thesis: form.thesis.trim(),
      initialGrade: (form.initialGrade as Grade) || null,
      status: 'open',
      overallNotes: form.overallNotes.trim(),
      review: null,
      executions: [],
      createdAt: now,
      updatedAt: now,
    });

    setForm(makeDefaultForm());
    onClose();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col gap-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">New Setup</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Row 1: Symbol, Direction, Setup Type, Grade, Date */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Symbol</label>
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
          <label className="text-xs font-medium text-zinc-400">Direction</label>
          <div className="flex h-9 rounded-md border border-zinc-700 overflow-hidden">
            {DIRECTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((f) => ({ ...f, direction: d }))}
                className={`flex-1 text-xs font-semibold transition-colors ${
                  form.direction === d
                    ? d === 'long'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {d === 'long' ? '↑ Long' : '↓ Short'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Setup Type</label>
          <select
            value={form.setupType}
            onChange={(e) =>
              setForm((f) => ({ ...f, setupType: e.target.value as SetupType }))
            }
            className={inputClass}
          >
            {SETUP_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">
            Grade{' '}
            <span className="text-zinc-600 font-normal">(opt)</span>
          </label>
          <select
            value={form.initialGrade}
            onChange={(e) =>
              setForm((f) => ({ ...f, initialGrade: e.target.value as Grade | '' }))
            }
            className={inputClass}
          >
            <option value="">—</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">
            Trading Date
            <span className="ml-1 text-zinc-600 font-normal">(ET)</span>
          </label>
          <input
            type="date"
            value={form.setupDate}
            onChange={(e) => setForm((f) => ({ ...f, setupDate: e.target.value }))}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">Thesis</label>
        <textarea
          rows={2}
          placeholder="Why are you taking this setup? What's the edge?"
          value={form.thesis}
          onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
          className={textareaClass}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">
          Notes{' '}
          <span className="text-zinc-600 font-normal">(optional)</span>
        </label>
        <textarea
          rows={1}
          placeholder="Key levels, context, risk parameters..."
          value={form.overallNotes}
          onChange={(e) => setForm((f) => ({ ...f, overallNotes: e.target.value }))}
          className={textareaClass}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="h-9 px-5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
        >
          Log Setup
        </button>
      </div>
    </form>
  );
}
