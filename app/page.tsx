'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { type TradeSetup, type Execution } from '@/types/setup';
import type { DayContext } from '@/types/dayContext';
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import SetupForm from '@/components/SetupForm';
import SetupLog from '@/components/SetupLog';
import CalendarView from '@/components/CalendarView';
import DailyDrillDown from '@/components/DailyDrillDown';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveView = 'log' | 'calendar';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [setups, setSetups] = useState<TradeSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showSetupForm, setShowSetupForm] = useState(false);
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
        .reduce((sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl, 0),
    [setups],
  );
  const totalPnlIdeal = useMemo(
    () =>
      setups
        .filter((s) => s.isIdeal)
        .reduce((sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl, 0),
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

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center px-6">
        <div className="text-center space-y-2">
          <p className="text-rose-400 text-sm font-medium">Database connection failed</p>
          <p className="text-zinc-500 text-xs max-w-sm">{error}</p>
          <p className="text-zinc-600 text-xs">Check that DATABASE_URL is set correctly in your .env file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      {/* ── Header ── */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white">Execution Ledger</h1>
            <p className="text-xs text-zinc-500">Trading Journal</p>
          </div>

          {setups.length > 0 && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-zinc-500">
                  {setups.length} setup{setups.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-zinc-500">{openCount} open</p>
              </div>
              {hasPnl && (
                <div className="text-right space-y-1">
                  <div>
                    <p className="text-xs text-zinc-500">Executed P&L</p>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        totalPnlExecuted >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPnl(totalPnlExecuted)}
                    </p>
                  </div>
                  {totalPnlIdeal !== 0 && (
                    <div>
                      <p className="text-[10px] text-violet-500/90">Ideal (hypothetical)</p>
                      <p
                        className={`text-xs font-semibold tabular-nums ${
                          totalPnlIdeal >= 0 ? 'text-violet-400' : 'text-violet-300'
                        }`}
                      >
                        {formatPnl(totalPnlIdeal)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-4xl px-6 py-8 flex flex-col gap-6">

        {/* ── Mutation error banner ── */}
        {mutationError && (
          <div className="flex items-center justify-between gap-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2.5">
            <p className="text-xs text-rose-400">{mutationError}</p>
            <button
              type="button"
              onClick={() => setMutationError(null)}
              className="text-xs text-rose-500 hover:text-rose-300 transition-colors shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Toolbar: view toggle + New Setup ── */}
        {showSetupForm ? (
          <SetupForm
            onLog={logSetup}
            onClose={() => setShowSetupForm(false)}
            defaultValues={selectedDate ? { setupDate: selectedDate } : undefined}
          />
        ) : (
          <div className="flex items-center justify-between">
            {/* Segmented view control */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveView('log')}
                className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeView === 'log'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Log
              </button>
              <button
                type="button"
                onClick={() => setActiveView('calendar')}
                className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeView === 'calendar'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Calendar
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSetupForm(true)}
              className="h-9 px-4 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              + New Setup
            </button>
          </div>
        )}

        {/* ── Active view ── */}
        {activeView === 'calendar' ? (
          <>
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
          </>
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
      </main>
    </div>
  );
}
