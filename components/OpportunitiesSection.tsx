'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MarketOpportunity, CreateOpportunityInput } from '@/types/opportunity';
import OpportunityCard from './OpportunityCard';
import OpportunityForm from './OpportunityForm';

interface OpportunitiesSectionProps {
  date: string; // YYYY-MM-DD
}

export default function OpportunitiesSection({ date }: OpportunitiesSectionProps) {
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/opportunities?date=${encodeURIComponent(date)}`);
      if (res.ok) setOpportunities(await res.json());
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(input: CreateOpportunityInput) {
    const res = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const created: MarketOpportunity = await res.json();
      setOpportunities((prev) => [...prev, created]);
      setShowForm(false);
    }
  }

  async function handleUpdate(id: string, input: CreateOpportunityInput) {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const updated: MarketOpportunity = await res.json();
      setOpportunities((prev) => prev.map((o) => (o.id === id ? updated : o)));
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' });
    if (res.ok) setOpportunities((prev) => prev.filter((o) => o.id !== id));
  }

  const missedCount = opportunities.filter((o) => !o.taken).length;
  const takenCount  = opportunities.filter((o) => o.taken).length;

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Opportunities
        </span>
        {opportunities.length > 0 && (
          <>
            {takenCount > 0 && (
              <span className="text-[10px] text-emerald-600">{takenCount} taken</span>
            )}
            {missedCount > 0 && (
              <span className="text-[10px] text-zinc-600">{missedCount} missed</span>
            )}
          </>
        )}
        <div className="h-px flex-1 bg-zinc-800" />
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
        >
          {showForm ? 'Cancel' : '+ Log'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <OpportunityForm
          date={date}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Cards */}
      {!loading && opportunities.length === 0 && !showForm && (
        <p className="text-[11px] text-zinc-700 italic">No opportunities logged for this day.</p>
      )}

      <div className="flex flex-col gap-2">
        {opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
