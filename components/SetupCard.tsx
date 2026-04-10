'use client';

import { useState } from 'react';
import {
  type TradeSetup,
  type Execution,
  type Regime,
  type VWAPState,
  type StructureType,
  type Alignment,
  GRADE_COLORS,
  ACTION_BORDER_COLORS,
  ACTION_LABELS,
  SETUP_TYPE_LABELS,
  REGIME_LABELS,
  TRANSITION_LABELS,
  VWAP_STATE_LABELS,
  STRUCTURE_TYPE_LABELS,
  ALIGNMENT_LABELS,
  REGIMES,
  VWAP_STATES,
  STRUCTURE_TYPES,
  ALIGNMENTS,
} from '@/types/setup';
import type { DayContext } from '@/types/dayContext';
import { formatPlannedRiskReward } from '@/lib/plannedRiskReward';

const REGIME_TAG: Record<Regime, string> = {
  UP:         'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  DOWN:       'bg-rose-500/10 text-rose-400 ring-rose-500/20',
  RANGE:      'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  CHOP:       'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  TRANSITION: 'bg-violet-500/10 text-violet-400 ring-violet-500/20',
};
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import { easternTimeFromIso, formatSetupDate } from '@/lib/dateUtils';
import ExecutionForm from './ExecutionForm';
import SetupForm from './SetupForm';
import ConfirmDialog from './ConfirmDialog';

interface SetupCardProps {
  setup: TradeSetup;
  onAddExecution: (setupId: string, execution: Execution) => void;
  onUpdateStatus: (setupId: string, status: 'open' | 'closed') => void;
  onDeleteSetup: () => Promise<void>;
  onUpdateSetup: (updated: TradeSetup) => Promise<void>;
  onUpdateExecution: (exec: Execution) => Promise<void>;
  onDeleteExecution: (execId: string) => Promise<void>;
}

type ConfirmTarget =
  | { type: 'deleteSetup' }
  | { type: 'deleteExecution'; execId: string };

function ExecutionRow({
  exec,
  setupId,
  setupDate,
  onUpdate,
  onDelete,
}: {
  exec: Execution;
  setupId: string;
  setupDate: string;
  onUpdate: (exec: Execution) => Promise<void>;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isEntry = exec.actionType === 'starter' || exec.actionType === 'add';

  if (isEditing) {
    return (
      <ExecutionForm
        setupId={setupId}
        setupDate={setupDate}
        initialExecution={exec}
        onSave={async (updated) => {
          await onUpdate(updated);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div
      className={`group flex flex-wrap items-baseline gap-x-3 gap-y-0 px-3 py-1.5 border-l-2 ${ACTION_BORDER_COLORS[exec.actionType]}`}
    >
      <span
        className="text-xs tabular-nums text-zinc-500 w-9 shrink-0 font-mono"
        title="Eastern Time"
      >
        {easternTimeFromIso(exec.executionTime)}
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
      <div className="ml-auto flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-zinc-500 hover:text-rose-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Day-level classification tags ────────────────────────────────────────────

function DayContextTags({ dc }: { dc: DayContext | null }) {
  if (!dc) return null;
  const { initialRegime, entryRegime, transition } = dc;
  if (!initialRegime && !entryRegime && (!transition || transition === 'NONE')) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {initialRegime && (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${REGIME_TAG[initialRegime]}`}>
          <span className="opacity-50 mr-0.5">i·</span>{REGIME_LABELS[initialRegime]}
        </span>
      )}
      {entryRegime && (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${REGIME_TAG[entryRegime]}`}>
          <span className="opacity-50 mr-0.5">s·</span>{REGIME_LABELS[entryRegime]}
        </span>
      )}
      {transition && transition !== 'NONE' && (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
          transition === 'FLIP'
            ? 'bg-violet-500/10 text-violet-400 ring-violet-500/20'
            : 'bg-orange-500/10 text-orange-400 ring-orange-500/20'
        }`}>
          {TRANSITION_LABELS[transition]}
        </span>
      )}
    </div>
  );
}

// ── Shared seg control ────────────────────────────────────────────────────────

function Seg<T extends string>({
  value,
  options,
  getLabel,
  colorOn,
  onChange,
}: {
  value: T | null;
  options: readonly T[];
  getLabel: (v: T) => string;
  colorOn?: (v: T) => string;
  onChange: (v: T | null) => void;
}) {
  const defaultOn = 'bg-indigo-700/60 text-indigo-200';
  return (
    <div className="flex h-6 overflow-hidden rounded border border-zinc-700/60">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? null : o)}
          className={`flex-1 truncate px-1.5 text-[10px] font-medium transition-colors ${
            value === o
              ? (colorOn ? colorOn(o) : defaultOn)
              : 'bg-zinc-900 text-zinc-600 hover:text-zinc-400'
          }`}
        >
          {getLabel(o)}
        </button>
      ))}
    </div>
  );
}

function regimeColor(r: Regime): string {
  if (r === 'UP')         return 'bg-emerald-700/60 text-emerald-200';
  if (r === 'DOWN')       return 'bg-rose-700/60    text-rose-200';
  if (r === 'CHOP')       return 'bg-yellow-700/60  text-yellow-200';
  if (r === 'TRANSITION') return 'bg-violet-700/60  text-violet-200';
  return                          'bg-amber-700/60  text-amber-200';
}
function alignColor(a: Alignment): string {
  if (a === 'WITH_TREND' || a === 'WITH') return 'bg-teal-700/60   text-teal-200';
  if (a === 'COUNTER')                    return 'bg-orange-700/60 text-orange-200';
  return                                         'bg-zinc-700      text-zinc-300';
}

// ── Layer 2: Market Reality inline panel ─────────────────────────────────────

function MarketRealityPanel({
  setup,
  onSave,
}: {
  setup: TradeSetup;
  onSave: (patch: Partial<Pick<TradeSetup, 'trueRegime' | 'vwapState' | 'structure' | 'alignment'>>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-zinc-800 px-5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Market Reality
        <span className="ml-2 font-normal normal-case text-zinc-600">at entry</span>
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <SegField label="Regime">
          <Seg
            value={setup.trueRegime}
            options={REGIMES}
            getLabel={(r) => REGIME_LABELS[r]}
            colorOn={regimeColor}
            onChange={(v) => onSave({ trueRegime: v })}
          />
        </SegField>
        <SegField label="VWAP">
          <Seg
            value={setup.vwapState}
            options={VWAP_STATES}
            getLabel={(v) => VWAP_STATE_LABELS[v]}
            onChange={(v) => onSave({ vwapState: v })}
          />
        </SegField>
        <SegField label="Structure">
          <Seg
            value={setup.structure}
            options={STRUCTURE_TYPES}
            getLabel={(s) => STRUCTURE_TYPE_LABELS[s]}
            onChange={(v) => onSave({ structure: v })}
          />
        </SegField>
        <SegField label="Alignment">
          <Seg
            value={setup.alignment}
            options={['WITH_TREND', 'COUNTER', 'NEUTRAL'] as const}
            getLabel={(a) => ALIGNMENT_LABELS[a]}
            colorOn={alignColor}
            onChange={(v) => onSave({ alignment: v as Alignment | null })}
          />
        </SegField>
      </div>
    </div>
  );
}

function SegField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">{label}</span>
      {children}
    </div>
  );
}

export default function SetupCard({
  setup,
  onAddExecution,
  onUpdateStatus,
  onDeleteSetup,
  onUpdateSetup,
  onUpdateExecution,
  onDeleteExecution,
}: SetupCardProps) {
  const [showExecForm, setShowExecForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

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
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    setConfirmPending(true);
    try {
      if (confirmTarget.type === 'deleteSetup') {
        await onDeleteSetup();
      } else {
        await onDeleteExecution(confirmTarget.execId);
        setConfirmTarget(null);
      }
    } finally {
      setConfirmPending(false);
      setConfirmTarget(null);
    }
  }

  // Edit mode: replace card with SetupForm
  if (editMode) {
    return (
      <SetupForm
        onLog={() => {}}
        onClose={() => setEditMode(false)}
        initialSetup={setup}
        onSave={async (updated) => {
          await onUpdateSetup(updated);
          setEditMode(false);
        }}
      />
    );
  }

  const confirmMessage =
    confirmTarget?.type === 'deleteSetup'
      ? `Permanently delete the "${setup.symbol} ${setup.setupType}" setup and all ${setup.executions.length} execution${setup.executions.length !== 1 ? 's' : ''}? This cannot be undone.`
      : 'Permanently delete this execution? This cannot be undone.';

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div className="flex flex-col gap-1.5">
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
                {SETUP_TYPE_LABELS[setup.setupType] ?? setup.setupType}
              </span>
              {setup.isIdeal && (
                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-violet-500/10 text-violet-300 ring-1 ring-inset ring-violet-500/25">
                  Ideal
                </span>
              )}
              {setup.setupName && (
                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/25">
                  {setup.setupName}
                </span>
              )}
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

            {/* Day-level classification tags sourced from setup.dayContext */}
            <DayContextTags dc={setup.dayContext} />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {hasRealizedPnl && (
              <span
                className={`text-sm font-bold tabular-nums ${
                  setup.isIdeal
                    ? pnl.realizedPnl >= 0
                      ? 'text-violet-400'
                      : 'text-violet-300'
                    : pnl.realizedPnl >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                }`}
                title={setup.isIdeal ? 'Ideal (hypothetical) P&L' : 'Executed P&L'}
              >
                {formatPnl(pnl.realizedPnl)}
                {setup.isIdeal && (
                  <span className="ml-1 text-[10px] font-semibold text-violet-500/80 normal-case">
                    id
                  </span>
                )}
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
                <dd className="text-zinc-300">
                  {setup.invalidationType
                    ? <span className="font-medium">{setup.invalidationType.replace(/_/g, ' ')}</span>
                    : <span className="text-zinc-600">—</span>}
                  {setup.invalidationNote && (
                    <span className="ml-2 text-zinc-400 font-normal">— {setup.invalidationNote}</span>
                  )}
                </dd>
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

        {/* ── Market Reality (Layer 2) ── */}
        <MarketRealityPanel
          setup={setup}
          onSave={(patch) => onUpdateSetup({ ...setup, ...patch })}
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
                <ExecutionRow
                  key={exec.id}
                  exec={exec}
                  setupId={setup.id}
                  setupDate={setup.setupDate}
                  onUpdate={onUpdateExecution}
                  onDelete={() => setConfirmTarget({ type: 'deleteExecution', execId: exec.id })}
                />
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
                  setup.isIdeal
                    ? pnl.realizedPnl >= 0
                      ? 'text-violet-400'
                      : 'text-violet-300'
                    : pnl.realizedPnl >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                }`}
              >
                {setup.isIdeal ? 'Hypothetical' : 'Realized'} {formatPnl(pnl.realizedPnl)}
              </span>
            </div>
          )}

          {/* Add execution inline form */}
          {showExecForm ? (
            <div className="px-5 pb-4">
              <ExecutionForm
                setupId={setup.id}
                setupDate={setup.setupDate}
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
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleToggleStatus}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {setup.status === 'open' ? 'Mark as Closed' : 'Reopen Setup'}
            </button>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmTarget({ type: 'deleteSetup' })}
              className="text-xs text-zinc-500 hover:text-rose-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.type === 'deleteSetup' ? 'Delete setup' : 'Delete execution'}
        message={confirmMessage}
        confirmLabel="Delete"
        pending={confirmPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
