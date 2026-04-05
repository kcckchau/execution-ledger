'use client';

import { useState } from 'react';
import { type TradeSetup, type Execution, type SetupReview } from '@/types/setup';
import type { DayContext } from '@/types/dayContext';
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import { formatSetupDate } from '@/lib/dateUtils';
import SetupCard from './SetupCard';
import DayContextCard from './DayContextCard';
import SetupSessionChart from './SetupSessionChart';
import OpportunitiesSection from './OpportunitiesSection';
import ConfirmDialog from './ConfirmDialog';

interface DailyDrillDownProps {
  date: string; // YYYY-MM-DD
  setups: TradeSetup[];
  onAddExecution: (setupId: string, execution: Execution) => void;
  onSaveReview: (setupId: string, review: SetupReview) => void;
  onUpdateStatus: (setupId: string, status: 'open' | 'closed') => void;
  onDeleteSetup: (id: string) => Promise<void>;
  onDeleteSetups: (ids: string[]) => Promise<void>;
  onUpdateSetup: (id: string, updated: TradeSetup) => Promise<void>;
  onUpdateExecution: (setupId: string, exec: Execution) => Promise<void>;
  onDeleteExecution: (setupId: string, execId: string) => Promise<void>;
  onUpdateDayContext: (date: string, dc: DayContext) => void;
}

export default function DailyDrillDown({
  date,
  setups,
  onAddExecution,
  onSaveReview,
  onUpdateStatus,
  onDeleteSetup,
  onDeleteSetups,
  onUpdateSetup,
  onUpdateExecution,
  onDeleteExecution,
  onUpdateDayContext,
}: DailyDrillDownProps) {
  const [showDeleteDayConfirm, setShowDeleteDayConfirm] = useState(false);
  const [deleteDayPending, setDeleteDayPending] = useState(false);

  const totalPnl = setups.reduce(
    (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
    0,
  );
  const hasPnl = setups.some((s) =>
    s.executions.some((e) => e.actionType === 'trim' || e.actionType === 'exit'),
  );

  async function handleDeleteDay() {
    setDeleteDayPending(true);
    try {
      await onDeleteSetups(setups.map((s) => s.id));
      setShowDeleteDayConfirm(false);
    } finally {
      setDeleteDayPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* ── Market section ── */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Market</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        <DayContextCard
          date={date}
          dayContext={setups[0]?.dayContext ?? null}
          onUpdate={(dc) => onUpdateDayContext(date, dc)}
        />

        {/* ── Opportunities section ── */}
        <OpportunitiesSection date={date} />

        {/* ── Trades section ── */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Trades</span>
          {setups.length > 0 && (
            <span className="text-[10px] text-zinc-600">{setups.length}</span>
          )}
          {hasPnl && (
            <span className={`text-[10px] font-medium tabular-nums ${
              totalPnl > 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {totalPnl > 0 ? '+' : ''}{formatPnl(totalPnl)}
            </span>
          )}
          <div className="h-px flex-1 bg-zinc-800" />
          {setups.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteDayConfirm(true)}
              className="text-[10px] text-zinc-700 hover:text-rose-400 transition-colors shrink-0"
            >
              Delete all
            </button>
          )}
        </div>

        {/* ── Session charts — one per unique symbol, lazy loaded ── */}
        {setups.length > 0 && (() => {
          const seenSymbols = new Set<string>();
          return setups
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
                executions={setups
                  .filter((gs) => gs.symbol === s.symbol)
                  .flatMap((gs) => gs.executions)}
              />
            ));
        })()}

        {/* ── Setup cards or empty state ── */}
        {setups.length === 0 ? (
          <p className="text-sm text-zinc-600 italic text-center py-6">
            No setups logged for this day.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {setups.map((setup) => (
              <SetupCard
                key={setup.id}
                setup={setup}
                onAddExecution={onAddExecution}
                onSaveReview={onSaveReview}
                onUpdateStatus={onUpdateStatus}
                onDeleteSetup={() => onDeleteSetup(setup.id)}
                onUpdateSetup={(updated) => onUpdateSetup(setup.id, updated)}
                onUpdateExecution={(exec) => onUpdateExecution(setup.id, exec)}
                onDeleteExecution={(execId) => onDeleteExecution(setup.id, execId)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteDayConfirm}
        title={`Delete all setups for ${formatSetupDate(date)}`}
        message={`Permanently delete all ${setups.length} setup${setups.length !== 1 ? 's' : ''} and their executions for ${date}? This cannot be undone.`}
        confirmLabel={`Delete ${setups.length}`}
        pending={deleteDayPending}
        onConfirm={handleDeleteDay}
        onCancel={() => setShowDeleteDayConfirm(false)}
      />
    </>
  );
}
