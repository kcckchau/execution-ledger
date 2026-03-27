'use client';

import { useState, useMemo, useEffect } from 'react';
import { type TradeSetup, type Execution, type SetupReview } from '@/types/setup';
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

  useEffect(() => {
    fetch('/api/setups')
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
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('log');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function logSetup(setup: TradeSetup) {
    await fetch('/api/setups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setup),
    });
    setSetups((prev) => [setup, ...prev]);
    setActiveView('log');
  }

  async function addExecution(setupId: string, execution: Execution) {
    await fetch(`/api/setups/${setupId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(execution),
    });
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId
          ? { ...s, executions: [...s.executions, execution], updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  }

  async function saveReview(setupId: string, review: SetupReview) {
    await fetch(`/api/setups/${setupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review }),
    });
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId ? { ...s, review, updatedAt: new Date().toISOString() } : s,
      ),
    );
  }

  async function updateStatus(setupId: string, status: 'open' | 'closed') {
    await fetch(`/api/setups/${setupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId ? { ...s, status, updatedAt: new Date().toISOString() } : s,
      ),
    );
  }

  async function updateSetup(id: string, updated: TradeSetup) {
    const res = await fetch(`/api/setups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      const data: TradeSetup = await res.json();
      setSetups((prev) => prev.map((s) => (s.id === id ? data : s)));
    }
  }

  async function deleteSetup(id: string) {
    await fetch(`/api/setups/${id}`, { method: 'DELETE' });
    setSetups((prev) => prev.filter((s) => s.id !== id));
  }

  async function deleteSetups(ids: string[]) {
    await fetch('/api/setups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    setSetups((prev) => prev.filter((s) => !ids.includes(s.id)));
  }

  async function updateExecution(setupId: string, exec: Execution) {
    const res = await fetch(`/api/setups/${setupId}/executions/${exec.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exec),
    });
    if (res.ok) {
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
  }

  async function deleteExecution(setupId: string, execId: string) {
    await fetch(`/api/setups/${setupId}/executions/${execId}`, { method: 'DELETE' });
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

  // ── Derived ───────────────────────────────────────────────────────────────

  const openCount = setups.filter((s) => s.status === 'open').length;
  const totalRealizedPnl = setups.reduce(
    (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
    0,
  );
  const hasPnl = setups.some((s) =>
    s.executions.some((e) => e.actionType === 'trim' || e.actionType === 'exit'),
  );

  const selectedDateSetups = useMemo(
    () =>
      selectedDate ? setups.filter((s) => s.setupDate === selectedDate) : [],
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
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Realized P&L</p>
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatPnl(totalRealizedPnl)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-4xl px-6 py-8 flex flex-col gap-6">

        {/* ── Toolbar: view toggle + New Setup ── */}
        {showSetupForm ? (
          <SetupForm onLog={logSetup} onClose={() => setShowSetupForm(false)} />
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
                onSaveReview={saveReview}
                onUpdateStatus={updateStatus}
                onDeleteSetup={deleteSetup}
                onDeleteSetups={deleteSetups}
                onUpdateSetup={updateSetup}
                onUpdateExecution={updateExecution}
                onDeleteExecution={deleteExecution}
              />
            )}
          </>
        ) : (
          <SetupLog
            setups={setups}
            onAddExecution={addExecution}
            onSaveReview={saveReview}
            onUpdateStatus={updateStatus}
            onDeleteSetup={deleteSetup}
            onDeleteSetups={deleteSetups}
            onUpdateSetup={updateSetup}
            onUpdateExecution={updateExecution}
            onDeleteExecution={deleteExecution}
          />
        )}
      </main>
    </div>
  );
}
