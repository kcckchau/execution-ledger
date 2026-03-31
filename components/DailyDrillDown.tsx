'use client';

import { useState } from 'react';
import { type TradeSetup, type Execution, type SetupReview } from '@/types/setup';
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import { formatSetupDate } from '@/lib/dateUtils';
import SetupCard from './SetupCard';
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
        {/* ── Day header ── */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{formatSetupDate(date)}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {setups.length === 0
                ? 'No setups'
                : `${setups.length} setup${setups.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {hasPnl && (
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Daily P&L</p>
                <p
                  className={`text-base font-bold tabular-nums ${
                    totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatPnl(totalPnl)}
                </p>
              </div>
            )}
            {setups.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteDayConfirm(true)}
                className="text-xs text-zinc-600 hover:text-rose-400 transition-colors"
              >
                Delete all
              </button>
            )}
          </div>
        </div>

        {/* ── Setup cards or empty state ── */}
        {setups.length === 0 ? (
          <p className="text-sm text-zinc-600 italic text-center py-6">
            No setups logged for this day.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {setups.map((setup, index) => {
              const chartKey = `${setup.symbol}::${setup.setupDate}`;
              const showChart =
                setups.findIndex((s) => `${s.symbol}::${s.setupDate}` === chartKey) === index;

              return (
                <SetupCard
                  key={setup.id}
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
              );
            })}
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
