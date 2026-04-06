'use client';

import { useState, useMemo } from 'react';
import { type TradeSetup, type Execution } from '@/types/setup';
import type { DayContext } from '@/types/dayContext';
import { EMPTY_FILTERS, filterTrades, computeTradeStats, type TradeFilters } from '@/lib/tradeFilters';
import { calcSetupPnl } from '@/lib/pnl';
import SetupCard from './SetupCard';
import DayContextCard from './DayContextCard';
import SetupSessionChart from './SetupSessionChart';
import OpportunitiesSection from './OpportunitiesSection';
import ConfirmDialog from './ConfirmDialog';
import TradeFiltersBar from './TradeFiltersBar';

interface SetupLogProps {
  setups: TradeSetup[];
  onAddExecution: (setupId: string, execution: Execution) => void;
  onUpdateStatus: (setupId: string, status: 'open' | 'closed') => void;
  onDeleteSetup: (id: string) => Promise<void>;
  onDeleteSetups: (ids: string[]) => Promise<void>;
  onUpdateSetup: (id: string, updated: TradeSetup) => Promise<void>;
  onUpdateExecution: (setupId: string, exec: Execution) => Promise<void>;
  onDeleteExecution: (setupId: string, execId: string) => Promise<void>;
  onUpdateDayContext: (date: string, dc: DayContext) => void;
}

export default function SetupLog({
  setups,
  onAddExecution,
  onUpdateStatus,
  onDeleteSetup,
  onDeleteSetups,
  onUpdateSetup,
  onUpdateExecution,
  onDeleteExecution,
  onUpdateDayContext,
}: SetupLogProps) {
  const [filters, setFilters] = useState<TradeFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);

  const filteredSetups = useMemo(() => filterTrades(setups, filters), [setups, filters]);
  const stats = useMemo(() => computeTradeStats(filteredSetups), [filteredSetups]);

  // Group filtered setups by date for DayContextCard rendering.
  const dateGroups = useMemo(() => {
    const groups: Array<{ date: string; setups: TradeSetup[]; dayContext: DayContext | null }> = [];
    let currentDate = '';
    for (const setup of filteredSetups) {
      if (setup.setupDate !== currentDate) {
        currentDate = setup.setupDate;
        groups.push({ date: currentDate, setups: [setup], dayContext: setup.dayContext });
      } else {
        groups[groups.length - 1].setups.push(setup);
      }
    }
    return groups;
  }, [filteredSetups]);

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
      <TradeFiltersBar setups={filteredSetups} filters={filters} stats={stats} onFiltersChange={setFilters} />

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
        <div className="flex flex-col gap-6">
          {dateGroups.map(({ date, setups: groupSetups, dayContext }) => {
            const dailyPnl = groupSetups.reduce(
              (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
              0,
            );
            const pnlSign = dailyPnl > 0 ? '+' : '';
            const pnlColor =
              dailyPnl > 0 ? 'text-emerald-400' : dailyPnl < 0 ? 'text-rose-400' : 'text-zinc-500';

            return (
            <div key={date} className="flex flex-col gap-3">
              {/* ── Market section ── */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Market</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <DayContextCard
                date={date}
                dayContext={dayContext}
                onUpdate={(dc) => onUpdateDayContext(date, dc)}
              />

              {/* ── Opportunities section ── */}
              <OpportunitiesSection date={date} />

              {/* ── Trades section ── */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Trades</span>
                <span className="text-[10px] text-zinc-600">{groupSetups.length}</span>
                {dailyPnl !== 0 && (
                  <span className={`text-[10px] font-medium tabular-nums ${pnlColor}`}>
                    {pnlSign}{dailyPnl.toFixed(2)}
                  </span>
                )}
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {/* ── Session charts — one per unique symbol, lazy loaded ── */}
              {(() => {
                const seenSymbols = new Set<string>();
                return groupSetups
                  .filter((s) => {
                    if (seenSymbols.has(s.symbol)) return false;
                    seenSymbols.add(s.symbol);
                    return true;
                  })
                  .map((s) => (
                    <SetupSessionChart
                      key={`${s.symbol}::${s.setupDate}`}
                      symbol={s.symbol}
                      setupDate={s.setupDate}
                      executions={groupSetups
                        .filter((gs) => gs.symbol === s.symbol)
                        .flatMap((gs) => gs.executions)}
                    />
                  ));
              })()}

              {/* Setup cards for this date */}
              {groupSetups.map((setup) => (
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
                      onAddExecution={onAddExecution}
                      onUpdateStatus={onUpdateStatus}
                      onDeleteSetup={() => onDeleteSetup(setup.id)}
                      onUpdateSetup={(updated) => onUpdateSetup(setup.id, updated)}
                      onUpdateExecution={(exec) => onUpdateExecution(setup.id, exec)}
                      onDeleteExecution={(execId) => onDeleteExecution(setup.id, execId)}
                    />
                  </div>
                </div>
              ))}
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
