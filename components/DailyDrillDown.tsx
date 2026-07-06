'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { type TradeSetup, type Execution } from '@/types/setup';
import type { DayContext } from '@/types/dayContext';
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import { getPointValue } from '@/lib/instrumentConfig';
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
  onMoveExecutions: (sourceSetupId: string, execIds: string[], targetSetupId: string) => Promise<boolean>;
  onCreateSetupAndMoveExecutions: (setup: TradeSetup, sourceSetupId: string, execIds: string[]) => Promise<boolean>;
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
  onMoveExecutions,
  onCreateSetupAndMoveExecutions,
  onUpdateDayContext,
}: DailyDrillDownProps) {
  const [showDeleteDayConfirm, setShowDeleteDayConfirm] = useState(false);
  const [deleteDayPending, setDeleteDayPending] = useState(false);
  const [mode, setMode] = useState<SetupMode>('executed');
  const [acctFilter, setAcctFilter] = useState<string | null>(null);

  const accounts = [...new Set(setups.map((s) => s.acctNumber).filter((a): a is string => a !== null))].sort();

  const allExecuted = setups.filter((s) => !s.isIdeal);
  const allIdeal = setups.filter((s) => s.isIdeal);
  const executedSetups = acctFilter ? allExecuted.filter((s) => s.acctNumber === acctFilter) : allExecuted;
  const idealSetups = acctFilter ? allIdeal.filter((s) => s.acctNumber === acctFilter) : allIdeal;
  const modeSetups = mode === 'executed' ? executedSetups : idealSetups;
  const visibleSetups = modeSetups;

  // Derive chart symbols from visible (account-filtered) setups.
  // Fall back to QQQ only when there are no visible setups at all.
  const chartSymbols = useMemo(() => {
    const symbols = [...new Set(visibleSetups.map((s) => s.symbol))];
    return symbols.length > 0 ? symbols : ['QQQ'];
  }, [visibleSetups]);

  const totalPnlExecuted = executedSetups.reduce(
    (sum, s) => sum + calcSetupPnl(s.executions, s.direction, getPointValue(s.symbol)).realizedPnl,
    0,
  );
  const totalPnlIdeal = idealSetups.reduce(
    (sum, s) => sum + calcSetupPnl(s.executions, s.direction, getPointValue(s.symbol)).realizedPnl,
    0,
  );
  const hasExecutedPnl = executedSetups.some((s) =>
    s.executions.some((e) => e.actionType === 'trim' || e.actionType === 'exit'),
  );
  const hasIdealPnl = idealSetups.some((s) =>
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

        {/* ── Account filter ── */}
        {accounts.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Acct</span>
            <div className="flex gap-1">
              {accounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAcctFilter(acctFilter === a ? null : a)}
                  className={`h-6 rounded px-2 text-[11px] font-medium transition-colors ${
                    acctFilter === a
                      ? 'border border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                      : 'border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Setups section header ── */}
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
          {mode === 'executed' && hasExecutedPnl && (
            <span className={`text-[10px] font-medium tabular-nums ${
              totalPnlExecuted > 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {totalPnlExecuted > 0 ? '+' : ''}{formatPnl(totalPnlExecuted)}
            </span>
          )}
          {mode === 'ideal' && idealSetups.length > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] text-violet-500/90">
              {hasIdealPnl && totalPnlIdeal !== 0 && (
                <span
                  className={`font-medium tabular-nums ${
                    totalPnlIdeal > 0 ? 'text-violet-400' : 'text-violet-300'
                  }`}
                >
                  {totalPnlIdeal > 0 ? '+' : ''}{formatPnl(totalPnlIdeal)}
                </span>
              )}
              <span className="font-normal text-violet-500/70">hypothetical</span>
            </span>
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

        {/* ── Per-symbol: chart → setups ── */}
        {chartSymbols.map((symbol) => {
          const symbolSetups = visibleSetups.filter((s) => s.symbol === symbol);
          return (
            <div key={`${symbol}::${date}`} className="flex flex-col gap-4">
              {/* Chart + View Chart link */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-end">
                  <Link
                    href={`/chart/${encodeURIComponent(symbol)}/${encodeURIComponent(date)}`}
                    className="text-[10px] font-medium text-zinc-600 transition-colors hover:text-indigo-400"
                  >
                    View Chart →
                  </Link>
                </div>
                <SetupSessionChart
                  symbol={symbol}
                  setupDate={date}
                  setups={symbolSetups}
                />
              </div>

              {/* Setup cards for this symbol */}
              {symbolSetups.length === 0 ? (
                <p className="text-sm text-zinc-600 italic text-center py-2">
                  {mode === 'ideal'
                    ? 'No ideal setups logged for this symbol.'
                    : 'No executed setups logged for this symbol.'}
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {symbolSetups.map((setup) => (
                    <SetupCard
                      key={setup.id}
                      setup={setup}
                      relatedSetups={symbolSetups.filter(
                        (candidate) => candidate.isIdeal === setup.isIdeal,
                      )}
                      onAddExecution={onAddExecution}
                      onUpdateStatus={onUpdateStatus}
                      onDeleteSetup={() => onDeleteSetup(setup.id)}
                      onUpdateSetup={(updated) => onUpdateSetup(setup.id, updated)}
                      onUpdateExecution={(exec) => onUpdateExecution(setup.id, exec)}
                      onDeleteExecution={(execId) => onDeleteExecution(setup.id, execId)}
                      onMoveExecutions={onMoveExecutions}
                      onCreateSetupAndMoveExecutions={onCreateSetupAndMoveExecutions}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
