'use client';

import { useState, useMemo } from 'react';
import { type TradeSetup, type Execution } from '@/types/setup';
import type { DayContext } from '@/types/dayContext';
import { EMPTY_FILTERS, filterTrades, computeTradeStats, type TradeFilters } from '@/lib/tradeFilters';
import { calcSetupPnl } from '@/lib/pnl';
import SetupCard from './SetupCard';
import DayContextCard from './DayContextCard';
import SetupSessionChart from './SetupSessionChart';
import TradeFiltersBar from './TradeFiltersBar';

interface SetupLogProps {
  setups: TradeSetup[];
  onAddExecution: (setupId: string, execution: Execution) => void;
  onUpdateStatus: (setupId: string, status: 'open' | 'closed') => void;
  onDeleteSetup: (id: string) => Promise<void>;
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
  onUpdateSetup,
  onUpdateExecution,
  onDeleteExecution,
  onUpdateDayContext,
}: SetupLogProps) {
  const [filters, setFilters] = useState<TradeFilters>(EMPTY_FILTERS);

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

      {filteredSetups.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 py-8 text-center">
          <p className="text-sm text-zinc-500">No trades match the current filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {dateGroups.map(({ date, setups: groupSetups, dayContext }) => {
            const dailyPnlExecuted = groupSetups
              .filter((s) => !s.isIdeal)
              .reduce(
                (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
                0,
              );
            const dailyPnlIdeal = groupSetups
              .filter((s) => s.isIdeal)
              .reduce(
                (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
                0,
              );

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

              {/* ── Trades section ── */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Trades</span>
                <span className="text-[10px] text-zinc-600">{groupSetups.length}</span>
                {dailyPnlExecuted !== 0 && (
                  <span
                    className={`text-[10px] font-medium tabular-nums ${
                      dailyPnlExecuted > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                    title="Executed P&L"
                  >
                    Ex {dailyPnlExecuted > 0 ? '+' : ''}
                    {dailyPnlExecuted.toFixed(2)}
                  </span>
                )}
                {dailyPnlIdeal !== 0 && (
                  <span
                    className={`text-[10px] font-medium tabular-nums ${
                      dailyPnlIdeal > 0 ? 'text-violet-400' : 'text-violet-300'
                    }`}
                    title="Ideal (hypothetical) P&L"
                  >
                    Id {dailyPnlIdeal > 0 ? '+' : ''}
                    {dailyPnlIdeal.toFixed(2)}
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
                      setups={groupSetups.filter((gs) => gs.symbol === s.symbol)}
                    />
                  ));
              })()}

              {/* Setup cards for this date */}
              {groupSetups.map((setup) => (
                <SetupCard
                  key={setup.id}
                  setup={setup}
                  onAddExecution={onAddExecution}
                  onUpdateStatus={onUpdateStatus}
                  onDeleteSetup={() => onDeleteSetup(setup.id)}
                  onUpdateSetup={(updated) => onUpdateSetup(setup.id, updated)}
                  onUpdateExecution={(exec) => onUpdateExecution(setup.id, exec)}
                  onDeleteExecution={(execId) => onDeleteExecution(setup.id, execId)}
                />
              ))}
            </div>
            );
          })}
        </div>
      )}
    </>
  );
}
