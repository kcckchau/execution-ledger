'use client';

import { useState } from 'react';
import { type Execution, type ActionType, ACTION_TYPES } from '@/types/setup';

interface ExecutionFormProps {
  setupId: string;
  onAdd: (execution: Execution) => void;
  onCancel: () => void;
}

function getCurrentTime(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function makeDefaultForm() {
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

export default function ExecutionForm({ setupId, onAdd, onCancel }: ExecutionFormProps) {
  const [form, setForm] = useState(makeDefaultForm);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.price);
    const size = parseFloat(form.size);
    if (isNaN(price) || isNaN(size) || size <= 0) return;

    const [hours, minutes] = form.time.split(':').map(Number);
    const execDate = new Date();
    execDate.setHours(hours, minutes, 0, 0);

    const now = new Date().toISOString();
    onAdd({
      id: crypto.randomUUID(),
      setupId,
      actionType: form.actionType,
      price,
      size,
      executionTime: execDate.toISOString(),
      note: form.note.trim(),
      createdAt: now,
      updatedAt: now,
    });

    setForm(makeDefaultForm());
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
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-8 px-4 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors"
        >
          Log Execution
        </button>
      </div>
    </form>
  );
}
