'use client';

import { useState } from 'react';
import {
  SETUP_TYPE_LABELS, REGIME_LABELS, VWAP_STATE_LABELS,
  STRUCTURE_TYPE_LABELS, ALIGNMENT_LABELS, OUTCOME_TYPE_LABELS,
  MISS_REASON_LABELS, TRIGGER_TYPE_LABELS,
} from '@/types/setup';
import type { MarketOpportunity, CreateOpportunityInput } from '@/types/opportunity';
import OpportunityForm from './OpportunityForm';

interface OpportunityCardProps {
  opportunity: MarketOpportunity;
  onUpdate: (id: string, patch: CreateOpportunityInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${className ?? 'bg-zinc-800 text-zinc-400 ring-zinc-700'}`}
    >
      {children}
    </span>
  );
}

function outcomeColor(outcome: string): string {
  if (outcome === 'WIN' || outcome === 'STRONG_WIN') return 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20';
  if (outcome === 'LOSS' || outcome === 'STRONG_LOSS') return 'bg-rose-500/10 text-rose-400 ring-rose-500/20';
  return 'bg-zinc-800 text-zinc-400 ring-zinc-700';
}

export default function OpportunityCard({ opportunity: o, onUpdate, onDelete }: OpportunityCardProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (editing) {
    return (
      <OpportunityForm
        date={o.date.slice(0, 10)}
        initial={o}
        onSave={async (input) => {
          await onUpdate(o.id, input);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`rounded-lg border bg-zinc-900 overflow-hidden ${
      o.isAPlus ? 'border-amber-500/40' : 'border-zinc-800'
    }`}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <span className="font-bold text-white">{o.symbol}</span>
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
          o.direction === 'LONG'
            ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/25'
            : 'bg-rose-500/10 text-rose-400 ring-rose-500/25'
        }`}>
          {o.direction === 'LONG' ? '↑ Long' : '↓ Short'}
        </span>
        <Tag>{SETUP_TYPE_LABELS[o.setupType] ?? o.setupType}</Tag>
        {o.triggerType && <Tag>{TRIGGER_TYPE_LABELS[o.triggerType]}</Tag>}
        {o.isAPlus && (
          <span className="text-[10px] font-bold text-amber-400">A+</span>
        )}
        {o.taken ? (
          <span className="ml-auto text-[10px] font-medium text-emerald-400">Taken</span>
        ) : (
          <span className="ml-auto text-[10px] font-medium text-zinc-500">Missed</span>
        )}
      </div>

      {/* Market state row */}
      <div className="flex flex-wrap gap-1.5 border-t border-zinc-800 px-4 py-2">
        <Tag className="bg-zinc-800/60 text-zinc-400 ring-zinc-700">
          {REGIME_LABELS[o.trueRegime]}
        </Tag>
        <Tag className="bg-zinc-800/60 text-zinc-400 ring-zinc-700">
          {VWAP_STATE_LABELS[o.vwapState]}
        </Tag>
        <Tag className="bg-zinc-800/60 text-zinc-400 ring-zinc-700">
          {STRUCTURE_TYPE_LABELS[o.structure]}
        </Tag>
        {o.alignment && (
          <Tag className="bg-zinc-800/60 text-zinc-400 ring-zinc-700">
            {ALIGNMENT_LABELS[o.alignment]}
          </Tag>
        )}
        {o.outcome && (
          <Tag className={outcomeColor(o.outcome)}>
            {OUTCOME_TYPE_LABELS[o.outcome]}
          </Tag>
        )}
        {!o.taken && o.missReason && (
          <Tag className="bg-rose-500/10 text-rose-300 ring-rose-500/20">
            {MISS_REASON_LABELS[o.missReason]}
          </Tag>
        )}
      </div>

      {/* Notes */}
      {o.notes && (
        <p className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">{o.notes}</p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 border-t border-zinc-800 px-4 py-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={async () => {
            setDeleting(true);
            try { await onDelete(o.id); } finally { setDeleting(false); }
          }}
          className="text-xs text-zinc-600 hover:text-rose-400 transition-colors disabled:opacity-40"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
