'use client';

import { useState } from 'react';
import { type Execution, type ActionType, ACTION_TYPES } from '@/types/setup';
import { easternDateTimeToIso, easternTimeFromIso } from '@/lib/dateUtils';

interface ExecutionFormProps {
  setupId: string;
  setupDate: string;
  /** Create mode: called with the new execution. */
  onAdd?: (execution: Execution) => void;
  /** Edit mode: called with the updated execution. Requires initialExecution. */
  onSave?: (execution: Execution) => void;
  onCancel: () => void;
  /** When provided, the form pre-fills and operates in edit mode. */
  initialExecution?: Execution;
}

function getCurrentTime(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

function makeForm(init?: Execution) {
  if (init) {
    return {
      actionType: init.actionType as ActionType,
      price: init.price.toString(),
      size: init.size.toString(),
      time: easternTimeFromIso(init.executionTime),
      note: init.note,
    };
  }
  return {
    actionType: 'starter' as ActionType,
    price: '',
    size: '',
    time: getCurrentTime(),
    note: '',
  };
}

const inputClass =
  'h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors';

export default function ExecutionForm({
  setupId,
  setupDate,
  onAdd,
  onSave,
  onCancel,
  initialExecution,
}: ExecutionFormProps) {
  const isEdit = !!initialExecution;
  const [form, setForm] = useState(() => makeForm(initialExecution));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.price);
    const size = parseInt(form.size, 10);
    if (!isFinite(price) || price <= 0) return;
    if (!isFinite(size) || size <= 0) return;

    const now = new Date().toISOString();
    const execution: Execution = {
      id: initialExecution?.id ?? crypto.randomUUID(),
      setupId,
      actionType: form.actionType,
      price,
      size,
      executionTime: easternDateTimeToIso(setupDate, form.time),
      note: form.note.trim(),
      createdAt: initialExecution?.createdAt ?? now,
      updatedAt: now,
    };

    setSaving(true);
    try {
      if (isEdit && onSave) {
        await onSave(execution);
      } else if (onAdd) {
        await onAdd(execution);
        setForm(makeForm());
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg flex flex-col gap-3"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Action</label>
          <select
            value={form.actionType}
            onChange={(e) =>
              setForm((f) => ({ ...f, actionType: e.target.value as ActionType }))
            }
            className={inputClass}
          >
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Price</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Size (sh)</label>
          <input
            type="number"
            step="1"
            min="1"
            placeholder="100"
            value={form.size}
            onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Time</label>
          <input
            type="time"
            value={form.time}
            onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">
            Note <span className="text-zinc-600 font-normal">(opt)</span>
          </label>
          <input
            type="text"
            placeholder="reason, level..."
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-8 px-4 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Execution'}
        </button>
      </div>
    </form>
  );
}
