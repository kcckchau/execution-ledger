'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { type TradeSetup, type Execution, SETUP_TYPE_LABELS, type SetupType } from '@/types/setup';
import type { DayContext } from '@/types/dayContext';
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import { getPointValue } from '@/lib/instrumentConfig';
import SetupForm from '@/components/SetupForm';
import SetupLog from '@/components/SetupLog';
import CalendarView from '@/components/CalendarView';
import DailyDrillDown from '@/components/DailyDrillDown';
import DetectSetupsModal from '@/components/DetectSetupsModal';
import type { SetupDraft } from '@/lib/detectSetups';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveView = 'log' | 'calendar';

// ─── Constants ────────────────────────────────────────────────────────────────

const SETUP_TYPE_COLORS: Record<string, string> = {
  VWAP_PLAY:      '#6366f1',
  TREND_PULLBACK: '#22c55e',
  FAILED_MOVE:    '#f59e0b',
  BREAKOUT:       '#ef4444',
  BREAKDOWN:      '#f87171',
  RANGE:          '#22d3ee',
};

function fmtSidebarDate(iso: string) {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [setups, setSetups] = useState<TradeSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [showDetectModal, setShowDetectModal] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('log');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/setups?limit=500')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSetups(data);
        } else {
          setError(data?.error ?? 'Failed to load setups');
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Network error'))
      .finally(() => setLoading(false));
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function logSetup(setup: TradeSetup) {
    setMutationError(null);
    const res = await fetch('/api/setups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setup),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to create setup');
      return;
    }
    const created: TradeSetup = await res.json();
    setSetups((prev) => [created, ...prev]);
    setActiveView('log');
  }

  async function confirmDetectedSetup(draft: SetupDraft): Promise<void> {
    const res = await fetch('/api/setups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? 'Failed to create setup');
    }
    const created: TradeSetup = await res.json();
    setSetups((prev) => [created, ...prev]);
  }

  async function addExecution(setupId: string, execution: Execution) {
    setMutationError(null);
    const res = await fetch(`/api/setups/${setupId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(execution),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to add execution');
      return;
    }
    const created: Execution = await res.json();
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId
          ? { ...s, executions: [...s.executions, created], updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  }

  async function updateStatus(setupId: string, status: 'open' | 'closed') {
    setMutationError(null);
    const res = await fetch(`/api/setups/${setupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to update status');
      return;
    }
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId ? { ...s, status, updatedAt: new Date().toISOString() } : s,
      ),
    );
  }

  async function updateSetup(id: string, updated: TradeSetup) {
    setMutationError(null);
    const res = await fetch(`/api/setups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to update setup');
      return;
    }
    const data: TradeSetup = await res.json();
    setSetups((prev) => prev.map((s) => (s.id === id ? data : s)));
  }

  async function deleteSetup(id: string) {
    setMutationError(null);
    const res = await fetch(`/api/setups/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to delete setup');
      return;
    }
    setSetups((prev) => prev.filter((s) => s.id !== id));
  }

  async function deleteSetups(ids: string[]) {
    setMutationError(null);
    const res = await fetch('/api/setups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to delete setups');
      return;
    }
    setSetups((prev) => prev.filter((s) => !ids.includes(s.id)));
  }

  async function updateExecution(setupId: string, exec: Execution) {
    setMutationError(null);
    const res = await fetch(`/api/setups/${setupId}/executions/${exec.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exec),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to update execution');
      return;
    }
    const data: Execution = await res.json();
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId
          ? {
              ...s,
              executions: s.executions.map((e) => (e.id === exec.id ? data : e)),
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
  }

  const updateDayContext = useCallback((date: string, dc: DayContext) => {
    setSetups((prev) =>
      prev.map((s) => (s.setupDate === date ? { ...s, dayContext: dc } : s)),
    );
  }, []);

  async function deleteExecution(setupId: string, execId: string) {
    setMutationError(null);
    const res = await fetch(`/api/setups/${setupId}/executions/${execId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to delete execution');
      return;
    }
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId
          ? {
              ...s,
              executions: s.executions.filter((e) => e.id !== execId),
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
  }

  async function moveExecutions(
    sourceSetupId: string,
    execIds: string[],
    targetSetupId: string,
  ): Promise<boolean> {
    setMutationError(null);
    const res = await fetch(`/api/setups/${sourceSetupId}/executions/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execIds, targetSetupId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to move executions');
      return false;
    }

    const movedExecutions: Execution[] = await res.json();
    const movedIds = new Set(movedExecutions.map((execution) => execution.id));

    setSetups((prev) =>
      prev.map((setup) => {
        if (setup.id === sourceSetupId) {
          return {
            ...setup,
            executions: setup.executions.filter((execution) => !movedIds.has(execution.id)),
            updatedAt: new Date().toISOString(),
          };
        }
        if (setup.id === targetSetupId) {
          return {
            ...setup,
            executions: [
              ...setup.executions.filter((execution) => !movedIds.has(execution.id)),
              ...movedExecutions,
            ],
            updatedAt: new Date().toISOString(),
          };
        }
        return setup;
      }),
    );

    return true;
  }

  async function createSetupAndMoveExecutions(
    setup: TradeSetup,
    sourceSetupId: string,
    execIds: string[],
  ): Promise<boolean> {
    setMutationError(null);

    const createRes = await fetch('/api/setups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setup),
    });
    if (!createRes.ok) {
      const data = await createRes.json().catch(() => ({}));
      setMutationError(data?.error ?? 'Failed to create setup');
      return false;
    }

    const created: TradeSetup = await createRes.json();
    setSetups((prev) => [created, ...prev]);

    const moved = await moveExecutions(sourceSetupId, execIds, created.id);
    if (!moved) {
      setSetups((prev) => prev.filter((candidate) => candidate.id !== created.id));
      return false;
    }

    return true;
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const openCount = useMemo(
    () => setups.filter((s) => s.status === 'open').length,
    [setups],
  );
  const totalPnlExecuted = useMemo(
    () =>
      setups
        .filter((s) => !s.isIdeal)
        .reduce((sum, s) => sum + calcSetupPnl(s.executions, s.direction, getPointValue(s.symbol)).realizedPnl, 0),
    [setups],
  );
  const totalPnlIdeal = useMemo(
    () =>
      setups
        .filter((s) => s.isIdeal)
        .reduce((sum, s) => sum + calcSetupPnl(s.executions, s.direction, getPointValue(s.symbol)).realizedPnl, 0),
    [setups],
  );
  const hasPnl = useMemo(
    () => setups.some((s) => s.executions.some((e) => e.actionType === 'trim' || e.actionType === 'exit')),
    [setups],
  );

  const selectedDateSetups = useMemo(
    () => selectedDate ? setups.filter((s) => s.setupDate === selectedDate) : [],
    [setups, selectedDate],
  );

  const recentDays = useMemo(() => {
    const byDate = new Map<string, TradeSetup[]>();
    for (const s of setups) {
      if (!byDate.has(s.setupDate)) byDate.set(s.setupDate, []);
      byDate.get(s.setupDate)!.push(s);
    }
    return [...byDate.entries()]
      .map(([date, daySetups]) => {
        const executed = daySetups.filter((s) => !s.isIdeal);
        const pnl = executed.reduce(
          (sum, s) => sum + calcSetupPnl(s.executions, s.direction, getPointValue(s.symbol)).realizedPnl, 0,
        );
        const symbols = [...new Set(executed.map((s) => s.symbol))].slice(0, 2).join(', ');
        const hasClosed = executed.some((s) =>
          s.executions.some((e) => e.actionType === 'exit' || e.actionType === 'trim'),
        );
        return { date, count: executed.length, pnl, symbols, hasClosed };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);
  }, [setups]);

  const setupTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of setups.filter((s) => !s.isIdeal && s.setupType)) {
      const t = s.setupType as string;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [setups]);

  const winRate = useMemo(() => {
    const closed = setups.filter(
      (s) => !s.isIdeal && s.executions.some((e) => e.actionType === 'exit' || e.actionType === 'trim'),
    );
    if (closed.length === 0) return null;
    const wins = closed.filter(
      (s) => calcSetupPnl(s.executions, s.direction, getPointValue(s.symbol)).realizedPnl > 0,
    ).length;
    return Math.round((wins / closed.length) * 100);
  }, [setups]);

  const executedCount = useMemo(() => setups.filter((s) => !s.isIdeal).length, [setups]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08080a]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1c1c24] border-t-[#6366f1]" />
          <p className="font-mono text-xs text-[#55555f]">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08080a] px-6">
        <div className="text-center">
          <p className="font-mono text-sm text-red-400">Database connection failed</p>
          <p className="mt-1 font-mono text-xs text-[#55555f]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: '#08080a', color: '#d1d1d8', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: '12px' }}
    >
      {/* ── Topbar ── */}
      <header
        className="flex h-[46px] shrink-0 items-center gap-0 px-1"
        style={{ background: '#0d0d10', borderBottom: '1px solid #1c1c24' }}
      >
        {/* Logo */}
        <span
          className="shrink-0 px-4 text-[12px] font-bold tracking-[0.12em]"
          style={{ fontFamily: '"Syne", "JetBrains Mono", sans-serif', color: '#818cf8' }}
        >
          LEDGER
        </span>
        <div className="mx-1 h-5 w-px shrink-0" style={{ background: '#25252f' }} />

        {/* Nav tabs */}
        <nav className="flex gap-0.5 px-2">
          {(['log', 'calendar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setActiveView(v)}
              className="rounded px-3 py-1.5 text-[11px] capitalize transition-all"
              style={
                activeView === v
                  ? { background: '#1e1e25', color: '#d1d1d8', border: '1px solid #25252f' }
                  : { background: 'transparent', color: '#55555f', border: '1px solid transparent' }
              }
            >
              {v}
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats */}
        {setups.length > 0 && (
          <div className="flex items-center gap-5 px-4">
            {hasPnl && (
              <>
                <div className="text-right">
                  <span className="block text-[9px] tracking-[0.05em]" style={{ color: '#55555f' }}>EXECUTED P&amp;L</span>
                  <span
                    className="text-[12px] font-semibold tabular-nums"
                    style={{ color: totalPnlExecuted >= 0 ? '#22c55e' : '#ef4444' }}
                  >
                    {formatPnl(totalPnlExecuted)}
                  </span>
                </div>
                <div className="h-5 w-px shrink-0" style={{ background: '#25252f' }} />
                {totalPnlIdeal !== 0 && (
                  <>
                    <div className="text-right">
                      <span className="block text-[9px] tracking-[0.05em]" style={{ color: '#55555f' }}>IDEAL P&amp;L</span>
                      <span className="text-[12px] font-semibold tabular-nums" style={{ color: '#a78bfa' }}>
                        {formatPnl(totalPnlIdeal)}
                      </span>
                    </div>
                    <div className="h-5 w-px shrink-0" style={{ background: '#25252f' }} />
                  </>
                )}
              </>
            )}
            <div className="text-right">
              <span className="block text-[9px] tracking-[0.05em]" style={{ color: '#55555f' }}>SETUPS</span>
              <span className="text-[12px] font-semibold">{executedCount}</span>
            </div>
            {winRate !== null && (
              <>
                <div className="h-5 w-px shrink-0" style={{ background: '#25252f' }} />
                <div className="text-right">
                  <span className="block text-[9px] tracking-[0.05em]" style={{ color: '#55555f' }}>WIN RATE</span>
                  <span className="text-[12px] font-semibold">{winRate}%</span>
                </div>
              </>
            )}
            {openCount > 0 && (
              <>
                <div className="h-5 w-px shrink-0" style={{ background: '#25252f' }} />
                <div className="text-right">
                  <span className="block text-[9px] tracking-[0.05em]" style={{ color: '#55555f' }}>OPEN</span>
                  <span className="text-[12px] font-semibold" style={{ color: '#f59e0b' }}>{openCount}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 px-3">
          <button
            type="button"
            onClick={() => setShowDetectModal(true)}
            className="rounded px-3 py-1.5 text-[11px] transition-all"
            style={{ border: '1px solid #25252f', background: 'transparent', color: '#55555f' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.color = '#818cf8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#25252f'; e.currentTarget.style.color = '#55555f'; }}
          >
            Detect Setups
          </button>
          <button
            type="button"
            onClick={() => setShowSetupForm((v) => !v)}
            className="rounded px-3 py-1.5 text-[11px] font-medium transition-all"
            style={{ background: '#6366f1', border: '1px solid #6366f1', color: '#fff' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#4f46e5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#6366f1'; }}
          >
            + New Setup
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside
          className="flex w-52 shrink-0 flex-col overflow-hidden"
          style={{ background: '#0d0d10', borderRight: '1px solid #1c1c24' }}
        >
          <div className="flex flex-1 flex-col overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#25252f #08080a' }}>

            {/* Recent days */}
            <div className="px-3.5 pb-1 pt-3.5 text-[9px] font-medium uppercase tracking-[0.1em]" style={{ color: '#38383f' }}>
              Recent Days
            </div>
            {recentDays.length === 0 && (
              <p className="px-3.5 py-2 text-[10px]" style={{ color: '#38383f' }}>No setups yet</p>
            )}
            {recentDays.map(({ date, count, pnl, symbols, hasClosed }) => {
              const isSelected = selectedDate === date;
              const dotColor = !hasClosed
                ? '#38383f'
                : pnl > 0 ? '#22c55e' : pnl < 0 ? '#ef4444' : '#f59e0b';
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setActiveView('calendar');
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left transition-all"
                  style={{
                    borderLeft: `2px solid ${isSelected ? '#6366f1' : 'transparent'}`,
                    background: isSelected ? '#6366f112' : 'transparent',
                    color: isSelected ? '#818cf8' : '#55555f',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = '#111115'; e.currentTarget.style.color = '#d1d1d8'; }}}
                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#55555f'; }}}
                >
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px]" style={{ color: isSelected ? '#818cf8' : '#d1d1d8' }}>
                      {fmtSidebarDate(date)}
                    </span>
                    <span className="block text-[9px]" style={{ color: '#38383f' }}>
                      {count} setup{count !== 1 ? 's' : ''}{symbols ? ` · ${symbols}` : ''}
                    </span>
                  </div>
                  {hasClosed && (
                    <span
                      className="shrink-0 text-[10px] font-semibold tabular-nums"
                      style={{ color: pnl > 0 ? '#22c55e' : pnl < 0 ? '#ef4444' : '#55555f' }}
                    >
                      {pnl > 0 ? '+' : ''}{formatPnl(pnl)}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Setup types */}
            {setupTypeCounts.length > 0 && (
              <>
                <div className="px-3.5 pb-1 pt-4 text-[9px] font-medium uppercase tracking-[0.1em]" style={{ color: '#38383f' }}>
                  Setup Types
                </div>
                {setupTypeCounts.map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2 px-3.5 py-1 text-[10px]" style={{ color: '#55555f' }}>
                    <div
                      className="h-1.5 w-1.5 shrink-0 rounded-sm"
                      style={{ background: SETUP_TYPE_COLORS[type] ?? '#55555f' }}
                    />
                    <span className="flex-1 truncate">
                      {SETUP_TYPE_LABELS[type as SetupType] ?? type}
                    </span>
                    <span style={{ color: '#38383f' }}>{count}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer summary */}
          {setups.length > 0 && (
            <div className="shrink-0 border-t p-3.5" style={{ borderColor: '#1c1c24' }}>
              {[
                { label: 'Total setups', value: String(executedCount) },
                winRate !== null ? { label: 'Win rate', value: `${winRate}%` } : null,
                openCount > 0 ? { label: 'Open positions', value: String(openCount), warn: true } : null,
              ].filter(Boolean).map((item) => (
                <div key={item!.label} className="mb-1 flex justify-between text-[10px]">
                  <span style={{ color: '#55555f' }}>{item!.label}</span>
                  <span
                    className="font-medium"
                    style={{ color: item!.warn ? '#f59e0b' : '#d1d1d8' }}
                  >
                    {item!.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <main className="flex flex-1 flex-col overflow-hidden">

          {/* Mutation error */}
          {mutationError && (
            <div
              className="flex shrink-0 items-center justify-between gap-4 px-5 py-2"
              style={{ background: '#2d0a0a', borderBottom: '1px solid #ef444430' }}
            >
              <p className="text-[11px]" style={{ color: '#f87171' }}>{mutationError}</p>
              <button
                type="button"
                onClick={() => setMutationError(null)}
                className="shrink-0 text-[11px] transition-colors"
                style={{ color: '#ef4444' }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Setup form (inline, dismissible) */}
          {showSetupForm && (
            <div
              className="shrink-0 border-b px-5 py-4"
              style={{ borderColor: '#1c1c24', background: '#0d0d10' }}
            >
              <SetupForm
                onLog={logSetup}
                onClose={() => setShowSetupForm(false)}
                defaultValues={selectedDate ? { setupDate: selectedDate } : undefined}
              />
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#25252f #08080a' }}>
            {activeView === 'calendar' ? (
              <div className="flex flex-col gap-5">
                <CalendarView
                  setups={setups}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
                {selectedDate !== null && (
                  <DailyDrillDown
                    date={selectedDate}
                    setups={selectedDateSetups}
                    onAddExecution={addExecution}
                    onUpdateStatus={updateStatus}
                    onDeleteSetup={deleteSetup}
                    onDeleteSetups={deleteSetups}
                    onUpdateSetup={updateSetup}
                    onUpdateExecution={updateExecution}
                    onDeleteExecution={deleteExecution}
                    onMoveExecutions={moveExecutions}
                    onCreateSetupAndMoveExecutions={createSetupAndMoveExecutions}
                    onUpdateDayContext={updateDayContext}
                  />
                )}
              </div>
            ) : (
              <SetupLog
                setups={setups}
                onAddExecution={addExecution}
                onUpdateStatus={updateStatus}
                onDeleteSetup={deleteSetup}
                onUpdateSetup={updateSetup}
                onUpdateExecution={updateExecution}
                onDeleteExecution={deleteExecution}
                onMoveExecutions={moveExecutions}
                onCreateSetupAndMoveExecutions={createSetupAndMoveExecutions}
                onUpdateDayContext={updateDayContext}
              />
            )}
          </div>
        </main>
      </div>

      <DetectSetupsModal
        open={showDetectModal}
        onClose={() => setShowDetectModal(false)}
        defaultDate={selectedDate ?? undefined}
        onConfirm={confirmDetectedSetup}
      />
    </div>
  );
}
