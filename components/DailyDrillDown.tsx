'use client';

import { useState } from 'react';
import { type TradeSetup, type Execution } from '@/types/setup';
import type { DayContext } from '@/types/dayContext';
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import { formatSetupDate } from '@/lib/dateUtils';
import SetupCard from './SetupCard';
import DayContextCard from './DayContextCard';
import SetupSessionChart from './SetupSessionChart';
import ConfirmDialog from './ConfirmDialog';

type SetupMode = 'executed' | 'ideal';

interface DailyDrillDownProps {
  date: string; // YYYY-MM-DD
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

export default function DailyDrillDown({
  date,
  setups,
  onAddExecution,
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
  const [mode, setMode] = useState<SetupMode>('executed');

  const executedSetups = setups.filter((s) => !s.isIdeal);
  const idealSetups = setups.filter((s) => s.isIdeal);
  const visibleSetups = mode === 'executed' ? executedSetups : idealSetups;

  // P&L is always from executed setups only — ideal setups never count.
  const totalPnl = executedSetups.reduce(
    (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
    0,
  );
  const hasPnl = executedSetups.some((s) =>
    s.executions.some((e) => e.actionType === 'trim' || e.actionType === 'exit'),
  );

  async function handleDeleteDay() {
    setDeleteDayPending(true);
    try {
      await onDeleteSetups(visibleSetups.map((s) => s.id));
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

        {/* ── Setups section ── */}
        <div className="flex items-center gap-2">
          {/* Executed / Ideal toggle */}
          <div className="flex rounded-md border border-zinc-800 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setMode('executed')}
              className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                mode === 'executed'
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Executed
            </button>
            <button
              type="button"
              onClick={() => setMode('ideal')}
              className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors border-l border-zinc-800 ${
                mode === 'ideal'
                  ? 'bg-violet-900/60 text-violet-300'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Ideal
            </button>
          </div>
          {visibleSetups.length > 0 && (
            <span className="text-[10px] text-zinc-600">{visibleSetups.length}</span>
          )}
          {mode === 'executed' && hasPnl && (
            <span className={`text-[10px] font-medium tabular-nums ${
              totalPnl > 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {totalPnl > 0 ? '+' : ''}{formatPnl(totalPnl)}
            </span>
          )}
          {mode === 'ideal' && idealSetups.length > 0 && (
            <span className="text-[10px] text-violet-500">not in P&amp;L</span>
          )}
          <div className="h-px flex-1 bg-zinc-800" />
          {visibleSetups.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteDayConfirm(true)}
              className="text-[10px] text-zinc-700 hover:text-rose-400 transition-colors shrink-0"
            >
              Delete all
            </button>
          )}
        </div>

        {/* ── Session charts — one per unique symbol in the visible set, lazy loaded ── */}
        {visibleSetups.length > 0 && (() => {
          const seenSymbols = new Set<string>();
          return visibleSetups
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
                setups={visibleSetups.filter((gs) => gs.symbol === s.symbol)}
              />
            ));
        })()}

        {/* ── Setup cards or empty state ── */}
        {visibleSetups.length === 0 ? (
          <p className="text-sm text-zinc-600 italic text-center py-6">
            {mode === 'ideal'
              ? 'No ideal setups logged for this day.'
              : 'No executed setups logged for this day.'}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleSetups.map((setup) => (
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
        )}
      </div>

      <ConfirmDialog
        open={showDeleteDayConfirm}
        title={`Delete ${mode} setups for ${formatSetupDate(date)}`}
        message={`Permanently delete all ${visibleSetups.length} ${mode} setup${visibleSetups.length !== 1 ? 's' : ''} and their executions for ${date}? This cannot be undone.`}
        confirmLabel={`Delete ${visibleSetups.length}`}
        pending={deleteDayPending}
        onConfirm={handleDeleteDay}
        onCancel={() => setShowDeleteDayConfirm(false)}
      />
    </>
  );
}
