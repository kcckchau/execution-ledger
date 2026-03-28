'use client';

import { useState } from 'react';
import {
  type TradeSetup,
  type Execution,
  type SetupReview,
  GRADE_COLORS,
  ACTION_BORDER_COLORS,
  ACTION_LABELS,
  MARKET_CONTEXT_LABELS,
} from '@/types/setup';
import { formatPlannedRiskReward } from '@/lib/plannedRiskReward';
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import { formatSetupDate } from '@/lib/dateUtils';
import ExecutionForm from './ExecutionForm';
import ReviewPanel from './ReviewPanel';
import SetupSessionChart from './SetupSessionChart';

interface SetupCardProps {
  setup: TradeSetup;
  onAddExecution: (setupId: string, execution: Execution) => void;
  onSaveReview: (setupId: string, review: SetupReview) => void;
  onUpdateStatus: (setupId: string, status: 'open' | 'closed') => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}


function ExecutionRow({ exec }: { exec: Execution }) {
  const isEntry = exec.actionType === 'starter' || exec.actionType === 'add';
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-0 px-3 py-1.5 border-l-2 ${ACTION_BORDER_COLORS[exec.actionType]}`}
    >
      <span className="text-xs tabular-nums text-zinc-500 w-9 shrink-0 font-mono">
        {formatTime(exec.executionTime)}
      </span>
      <span className="text-xs font-semibold text-zinc-400 w-12 shrink-0">
        {ACTION_LABELS[exec.actionType]}
      </span>
      <span
        className={`text-xs tabular-nums font-semibold w-16 shrink-0 ${
          isEntry ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {isEntry ? '+' : '-'}{exec.size} sh
      </span>
      <span className="text-xs text-zinc-600">@</span>
      <span className="text-xs tabular-nums font-medium text-white">
        ${exec.price.toFixed(2)}
      </span>
      {exec.note && (
        <span className="text-xs text-zinc-500 ml-1">— {exec.note}</span>
      )}
    </div>
  );
}

export default function SetupCard({
  setup,
  onAddExecution,
  onSaveReview,
  onUpdateStatus,
}: SetupCardProps) {
  const [showExecForm, setShowExecForm] = useState(false);
  const [showReview, setShowReview] = useState(!!setup.review);

  const pnl = calcSetupPnl(setup.executions, setup.direction);
  const hasExecutions = setup.executions.length > 0;
  const hasRealizedPnl = pnl.totalExitSize > 0;
  const plannedRR = formatPlannedRiskReward(
    setup.riskEntry,
    setup.riskStop,
    setup.riskTarget,
    setup.direction
  );
  const hasRiskPlan =
    setup.riskEntry.trim() || setup.riskStop.trim() || setup.riskTarget.trim();

  const sortedExecutions = [...setup.executions].sort(
    (a, b) => new Date(a.executionTime).getTime() - new Date(b.executionTime).getTime(),
  );

  function handleToggleStatus() {
    const next = setup.status === 'open' ? 'closed' : 'open';
    onUpdateStatus(setup.id, next);
    if (next === 'closed') setShowReview(true);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold text-white tracking-tight">
            {setup.symbol}
          </span>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
              setup.direction === 'long'
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/25'
                : 'bg-rose-500/10 text-rose-400 ring-rose-500/25'
            }`}
          >
            {setup.direction === 'long' ? '↑ Long' : '↓ Short'}
          </span>
          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-700">
            {setup.setupType}
          </span>
          {setup.initialGrade && (
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                GRADE_COLORS[setup.initialGrade] ?? GRADE_COLORS['C']
              }`}
            >
              {setup.initialGrade}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasRealizedPnl && (
            <span
              className={`text-sm font-bold tabular-nums ${
                pnl.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatPnl(pnl.realizedPnl)}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                setup.status === 'open' ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs text-zinc-400 font-medium capitalize">
              {setup.status}
            </span>
          </div>
          <span className="text-xs text-zinc-600">{formatSetupDate(setup.setupDate)}</span>
        </div>
      </div>

      {/* ── Decision + risk + notes ── */}
      <div className="flex flex-col gap-3 px-5 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Decision
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="shrink-0 text-zinc-500">Context</dt>
              <dd className="text-zinc-200">
                {MARKET_CONTEXT_LABELS[setup.marketContext]}
              </dd>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <dt className="shrink-0 text-zinc-500">Setup</dt>
              <dd className="text-zinc-200">{setup.setupType}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <dt className="text-zinc-500">Trigger</dt>
              <dd className="text-zinc-300">{setup.trigger}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <dt className="text-zinc-500">Invalidation</dt>
              <dd className="text-zinc-300">{setup.invalidation}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <dt className="text-zinc-500">Target (idea)</dt>
              <dd className="text-zinc-300">{setup.decisionTarget}</dd>
            </div>
          </dl>
        </div>

        {hasRiskPlan && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Risk plan
            </p>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {setup.riskEntry.trim() && (
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Entry</dt>
                  <dd className="font-mono tabular-nums text-zinc-200">{setup.riskEntry}</dd>
                </div>
              )}
              {setup.riskStop.trim() && (
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Stop</dt>
                  <dd className="font-mono tabular-nums text-zinc-200">{setup.riskStop}</dd>
                </div>
              )}
              {setup.riskTarget.trim() && (
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Target</dt>
                  <dd className="font-mono tabular-nums text-zinc-200">{setup.riskTarget}</dd>
                </div>
              )}
              {plannedRR !== null && (
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Planned R:R</dt>
                  <dd className="font-mono tabular-nums text-emerald-400/90">
                    1 : {plannedRR}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {setup.overallNotes && (
          <p className="text-xs leading-relaxed text-zinc-500">{setup.overallNotes}</p>
        )}
      </div>

      <SetupSessionChart
        key={`${setup.symbol}-${setup.setupDate}`}
        symbol={setup.symbol}
        setupDate={setup.setupDate}
        executions={setup.executions}
      />

      {/* ── Executions ── */}
      <div className="border-t border-zinc-800">
        <div className="flex items-center justify-between px-5 py-2.5">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Executions{hasExecutions ? ` · ${setup.executions.length}` : ''}
          </span>
        </div>

        {hasExecutions ? (
          <div className="flex flex-col px-5 pb-1 gap-0.5">
            {sortedExecutions.map((exec) => (
              <ExecutionRow key={exec.id} exec={exec} />
            ))}
          </div>
        ) : (
          <p className="px-5 pb-3 text-xs text-zinc-600 italic">
            No executions logged yet.
          </p>
        )}

        {/* P&L stats bar */}
        {hasRealizedPnl && (
          <div className="mx-5 mb-3 mt-2 flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 bg-zinc-800 rounded-md text-xs border border-zinc-700">
            {pnl.avgEntry !== null && (
              <span className="text-zinc-500">
                Avg entry{' '}
                <span className="font-semibold text-zinc-200 tabular-nums">
                  ${pnl.avgEntry.toFixed(2)}
                </span>
              </span>
            )}
            {pnl.avgExit !== null && (
              <span className="text-zinc-500">
                Avg exit{' '}
                <span className="font-semibold text-zinc-200 tabular-nums">
                  ${pnl.avgExit.toFixed(2)}
                </span>
              </span>
            )}
            {pnl.openSize > 0 && (
              <span className="text-zinc-500">
                Open{' '}
                <span className="font-semibold text-zinc-200 tabular-nums">
                  {pnl.openSize} sh
                </span>
              </span>
            )}
            <span
              className={`font-bold tabular-nums ${
                pnl.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              Realized {formatPnl(pnl.realizedPnl)}
            </span>
          </div>
        )}

        {/* Add execution inline form */}
        {showExecForm ? (
          <div className="px-5 pb-4">
            <ExecutionForm
              setupId={setup.id}
              onAdd={(exec) => {
                onAddExecution(setup.id, exec);
                setShowExecForm(false);
              }}
              onCancel={() => setShowExecForm(false)}
            />
          </div>
        ) : setup.status === 'open' ? (
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => setShowExecForm(true)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              + Add Execution
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
        <button
          type="button"
          onClick={handleToggleStatus}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {setup.status === 'open' ? 'Mark as Closed' : 'Reopen Setup'}
        </button>
        <button
          type="button"
          onClick={() => setShowReview((v) => !v)}
          className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          {showReview
            ? 'Hide Review'
            : setup.review
            ? 'View Review'
            : 'Write Review'}
        </button>
      </div>

      {/* ── Review ── */}
      {showReview && (
        <div className="border-t border-zinc-800 px-5 py-4">
          <ReviewPanel
            review={setup.review}
            pnlContext={hasRealizedPnl ? formatPnl(pnl.realizedPnl) : null}
            onSave={(rev) => onSaveReview(setup.id, rev)}
          />
        </div>
      )}
    </div>
  );
}
