'use client';

import { useState, useMemo } from 'react';
import { type TradeSetup, type Execution, type SetupReview } from '@/types/setup';
import { EMPTY_FILTERS, filterTrades, computeTradeStats, type TradeFilters } from '@/lib/tradeFilters';
import SetupCard from './SetupCard';
import ConfirmDialog from './ConfirmDialog';
import TradeFiltersBar from './TradeFiltersBar';

interface SetupLogProps {
  setups: TradeSetup[];
  onAddExecution: (setupId: string, execution: Execution) => void;
  onSaveReview: (setupId: string, review: SetupReview) => void;
  onUpdateStatus: (setupId: string, status: 'open' | 'closed') => void;
  onDeleteSetup: (id: string) => Promise<void>;
  onDeleteSetups: (ids: string[]) => Promise<void>;
  onUpdateSetup: (id: string, updated: TradeSetup) => Promise<void>;
  onUpdateExecution: (setupId: string, exec: Execution) => Promise<void>;
  onDeleteExecution: (setupId: string, execId: string) => Promise<void>;
}

export default function SetupLog({
  setups,
  onAddExecution,
  onSaveReview,
  onUpdateStatus,
  onDeleteSetup,
  onDeleteSetups,
  onUpdateSetup,
  onUpdateExecution,
  onDeleteExecution,
}: SetupLogProps) {
  const [filters, setFilters] = useState<TradeFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);

  const filteredSetups = useMemo(() => filterTrades(setups, filters), [setups, filters]);
  const stats = useMemo(() => computeTradeStats(filteredSetups), [filteredSetups]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    setBulkPending(true);
    try {
      await onDeleteSetups(ids);
      setSelected(new Set());
      setShowBulkConfirm(false);
    } finally {
      setBulkPending(false);
    }
  }

  if (setups.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <p className="text-sm font-medium text-zinc-300">No setups logged yet.</p>
        <p className="mt-1.5 text-xs text-zinc-500 max-w-xs mx-auto">
          Start by logging a structured decision and risk plan, then add executions.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Filter bar + stats — always visible when there are setups */}
      <TradeFiltersBar filters={filters} stats={stats} onFiltersChange={setFilters} />

      {/* Bulk action bar — only visible when rows are selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5">
          <span className="text-xs text-zinc-400">
            {selected.size} setup{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowBulkConfirm(true)}
              className="h-7 px-3 rounded border border-rose-600/30 bg-rose-600/20 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-600/40"
            >
              Delete {selected.size}
            </button>
          </div>
        </div>
      )}

      {filteredSetups.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 py-8 text-center">
          <p className="text-sm text-zinc-500">No trades match the current filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredSetups.map((setup, index) => {
            const chartKey = `${setup.symbol}::${setup.setupDate}`;
            const showChart =
              filteredSetups.findIndex((s) => `${s.symbol}::${s.setupDate}` === chartKey) === index;

            return (
              <div key={setup.id} className="flex items-start gap-3">
                <div className="pt-[18px] pl-1 shrink-0">
                  <input
                    type="checkbox"
                    checked={selected.has(setup.id)}
                    onChange={() => toggleSelect(setup.id)}
                    title="Select setup"
                    className="h-3.5 w-3.5 cursor-pointer rounded-sm border-zinc-600 accent-indigo-500"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <SetupCard
                    setup={setup}
                    showChart={showChart}
                    onAddExecution={onAddExecution}
                    onSaveReview={onSaveReview}
                    onUpdateStatus={onUpdateStatus}
                    onDeleteSetup={() => onDeleteSetup(setup.id)}
                    onUpdateSetup={(updated) => onUpdateSetup(setup.id, updated)}
                    onUpdateExecution={(exec) => onUpdateExecution(setup.id, exec)}
                    onDeleteExecution={(execId) => onDeleteExecution(setup.id, execId)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={showBulkConfirm}
        title="Delete selected setups"
        message={`Permanently delete ${selected.size} setup${selected.size !== 1 ? 's' : ''} and all their executions? This cannot be undone.`}
        confirmLabel={`Delete ${selected.size}`}
        pending={bulkPending}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkConfirm(false)}
      />
    </>
  );
}
