'use client';

import { useState } from 'react';
import { type SetupReview } from '@/types/setup';

interface ReviewPanelProps {
  review: SetupReview | null;
  onSave: (review: SetupReview) => void;
  pnlContext?: string | null;
}

const defaultReview: SetupReview = {
  followedPlan: null,
  wentWell: '',
  failed: '',
  lesson: '',
};

const textareaClass =
  'rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white resize-none ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors';

export default function ReviewPanel({ review, onSave, pnlContext }: ReviewPanelProps) {
  const [isEditing, setIsEditing] = useState(!review);
  const [form, setForm] = useState<SetupReview>(review ?? defaultReview);

  function handleEdit() {
    if (review) setForm(review);
    setIsEditing(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    setIsEditing(false);
  }

  if (!isEditing && review) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Review
          </span>
          <div className="flex items-center gap-3">
            {pnlContext != null && (
              <span className="text-xs text-zinc-500">
                Outcome:{' '}
                <span
                  className={`font-semibold tabular-nums ${
                    pnlContext.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {pnlContext}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={handleEdit}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Followed plan?</span>
          <span
            className={`text-xs font-semibold ${
              review.followedPlan === null
                ? 'text-zinc-500'
                : review.followedPlan
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {review.followedPlan === null ? '—' : review.followedPlan ? 'Yes' : 'No'}
          </span>
        </div>

        {review.wentWell && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">What went well</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{review.wentWell}</p>
          </div>
        )}
        {review.failed && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">What failed</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{review.failed}</p>
          </div>
        )}
        {review.lesson && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Lesson</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{review.lesson}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Review
        </span>
        {pnlContext != null && (
          <span className="text-xs text-zinc-500">
            Outcome:{' '}
            <span
              className={`font-semibold tabular-nums ${
                pnlContext.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {pnlContext}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400">Followed plan?</span>
        <div className="flex gap-1">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setForm((f) => ({ ...f, followedPlan: val }))}
              className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                form.followedPlan === val
                  ? val
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                  : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 border border-zinc-700'
              }`}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">What went well</label>
        <textarea
          rows={2}
          placeholder="Execution quality, read of tape, discipline..."
          value={form.wentWell}
          onChange={(e) => setForm((f) => ({ ...f, wentWell: e.target.value }))}
          className={textareaClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">What failed</label>
        <textarea
          rows={2}
          placeholder="Sizing errors, early exit, chasing..."
          value={form.failed}
          onChange={(e) => setForm((f) => ({ ...f, failed: e.target.value }))}
          className={textareaClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">Lesson</label>
        <textarea
          rows={2}
          placeholder="What would you do differently next time?"
          value={form.lesson}
          onChange={(e) => setForm((f) => ({ ...f, lesson: e.target.value }))}
          className={textareaClass}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {review && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="h-8 px-4 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors"
        >
          Save Review
        </button>
      </div>
    </form>
  );
}
