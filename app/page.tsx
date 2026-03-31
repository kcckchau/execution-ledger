'use client';

import { useState, useMemo } from 'react';
import { type TradeSetup, type Execution, type SetupReview } from '@/types/setup';
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import SetupForm from '@/components/SetupForm';
import SetupLog from '@/components/SetupLog';
import CalendarView from '@/components/CalendarView';
import DailyDrillDown from '@/components/DailyDrillDown';

// ─── Seed Data ────────────────────────────────────────────────────────────────
// Multiple days of realistic setups so the calendar shows a meaningful preview.

const SEED_SETUPS: TradeSetup[] = [
  // ── March 24 (Mon) ── SPY VWAP long, partial exit
  {
    id: 'seed-mar24-spy',
    setupDate: '2026-03-24',
    symbol: 'SPY',
    direction: 'long',
    marketContext: 'uptrend',
    setupType: 'VWAP Reclaim',
    trigger: 'VWAP reclaim after morning flush on above-average volume',
    invalidation: 'Close back below VWAP / 447.50',
    decisionTarget: 'Continuation through 448+ with tape confirmation',
    riskEntry: '448.2',
    riskStop: '447.5',
    riskTarget: '449.5',
    initialGrade: 'A',
    status: 'open',
    overallNotes: '10-day AVWAP as secondary target. Hard stop below 447.50.',
    review: null,
    executions: [
      {
        id: 'seed-mar24-spy-e1',
        setupId: 'seed-mar24-spy',
        actionType: 'starter',
        price: 448.2,
        size: 100,
        executionTime: '2026-03-24T09:41:00.000Z',
        note: 'Clean break above VWAP',
        createdAt: '2026-03-24T09:41:00.000Z',
        updatedAt: '2026-03-24T09:41:00.000Z',
      },
      {
        id: 'seed-mar24-spy-e2',
        setupId: 'seed-mar24-spy',
        actionType: 'add',
        price: 448.42,
        size: 50,
        executionTime: '2026-03-24T09:44:00.000Z',
        note: 'Held VWAP on first pullback',
        createdAt: '2026-03-24T09:44:00.000Z',
        updatedAt: '2026-03-24T09:44:00.000Z',
      },
      {
        id: 'seed-mar24-spy-e3',
        setupId: 'seed-mar24-spy',
        actionType: 'trim',
        price: 448.88,
        size: 75,
        executionTime: '2026-03-24T09:52:00.000Z',
        note: 'First target, locking in',
        createdAt: '2026-03-24T09:52:00.000Z',
        updatedAt: '2026-03-24T09:52:00.000Z',
      },
    ],
    createdAt: '2026-03-24T09:30:00.000Z',
    updatedAt: '2026-03-24T09:52:00.000Z',
  },

  // ── March 21 (Fri) ── NVDA Breakout long, stopped out
  {
    id: 'seed-mar21-nvda',
    setupDate: '2026-03-21',
    symbol: 'NVDA',
    direction: 'long',
    marketContext: 'uptrend',
    setupType: 'ORB Breakout',
    trigger: 'Break above 5-day consolidation with expanding volume',
    invalidation: 'Failed hold — price back below breakout level',
    decisionTarget: '930',
    riskEntry: '922.5',
    riskStop: '917',
    riskTarget: '930',
    initialGrade: 'B',
    status: 'closed',
    overallNotes: 'Keep size small — earnings cycle risk still elevated.',
    review: {
      followedPlan: true,
      wentWell: 'Identified the level correctly. Entry was clean.',
      failed: 'Failed breakout — price reversed on broad market selling. Should have waited for market confirmation.',
      lesson: 'Breakout setups during uncertain macro need market confirmation before entry.',
    },
    executions: [
      {
        id: 'seed-mar21-nvda-e1',
        setupId: 'seed-mar21-nvda',
        actionType: 'starter',
        price: 922.5,
        size: 50,
        executionTime: '2026-03-21T09:48:00.000Z',
        note: 'Breakout of consolidation high',
        createdAt: '2026-03-21T09:48:00.000Z',
        updatedAt: '2026-03-21T09:48:00.000Z',
      },
      {
        id: 'seed-mar21-nvda-e2',
        setupId: 'seed-mar21-nvda',
        actionType: 'exit',
        price: 919.9,
        size: 50,
        executionTime: '2026-03-21T10:05:00.000Z',
        note: 'Stopped out — reversal through entry',
        createdAt: '2026-03-21T10:05:00.000Z',
        updatedAt: '2026-03-21T10:05:00.000Z',
      },
    ],
    createdAt: '2026-03-21T09:40:00.000Z',
    updatedAt: '2026-03-21T10:05:00.000Z',
  },

  // ── March 20 (Thu) ── QQQ ORB long, full exit
  {
    id: 'seed-mar20-qqq',
    setupDate: '2026-03-20',
    symbol: 'QQQ',
    direction: 'long',
    marketContext: 'range',
    setupType: 'ORB Breakout',
    trigger: 'Break of opening range after tight 5m range with volume',
    invalidation: 'Back inside range / failed breakout',
    decisionTarget: 'Prior HOD / 452',
    riskEntry: '450.2',
    riskStop: '449.4',
    riskTarget: '452',
    initialGrade: 'A',
    status: 'closed',
    overallNotes: 'Watch for fade at $452 — prior resistance.',
    review: {
      followedPlan: true,
      wentWell: 'Perfect execution. Held through the noise, took profits at plan levels.',
      failed: 'Nothing — this was a textbook setup.',
      lesson: 'ORB works when you wait for the range to form and the break to be clean.',
    },
    executions: [
      {
        id: 'seed-mar20-qqq-e1',
        setupId: 'seed-mar20-qqq',
        actionType: 'starter',
        price: 450.2,
        size: 100,
        executionTime: '2026-03-20T09:35:00.000Z',
        note: 'ORB break with volume',
        createdAt: '2026-03-20T09:35:00.000Z',
        updatedAt: '2026-03-20T09:35:00.000Z',
      },
      {
        id: 'seed-mar20-qqq-e2',
        setupId: 'seed-mar20-qqq',
        actionType: 'trim',
        price: 451.6,
        size: 50,
        executionTime: '2026-03-20T09:51:00.000Z',
        note: 'Half off at first target',
        createdAt: '2026-03-20T09:51:00.000Z',
        updatedAt: '2026-03-20T09:51:00.000Z',
      },
      {
        id: 'seed-mar20-qqq-e3',
        setupId: 'seed-mar20-qqq',
        actionType: 'exit',
        price: 452.0,
        size: 50,
        executionTime: '2026-03-20T10:03:00.000Z',
        note: 'Full exit at prior HOD resistance',
        createdAt: '2026-03-20T10:03:00.000Z',
        updatedAt: '2026-03-20T10:03:00.000Z',
      },
    ],
    createdAt: '2026-03-20T09:30:00.000Z',
    updatedAt: '2026-03-20T10:03:00.000Z',
  },

  // ── March 20 (Thu) ── AAPL Pullback long (same day, 2nd setup)
  {
    id: 'seed-mar20-aapl',
    setupDate: '2026-03-20',
    symbol: 'AAPL',
    direction: 'long',
    marketContext: 'uptrend',
    setupType: 'VWAP Reclaim',
    trigger: 'Pullback to 8EMA on low volume after strong open',
    invalidation: 'Loss of 8EMA / morning low',
    decisionTarget: 'HOD / prior day high',
    riskEntry: '196.5',
    riskStop: '196',
    riskTarget: '197.8',
    initialGrade: 'B',
    status: 'closed',
    overallNotes: 'Stop below $196.',
    review: null,
    executions: [
      {
        id: 'seed-mar20-aapl-e1',
        setupId: 'seed-mar20-aapl',
        actionType: 'starter',
        price: 196.5,
        size: 75,
        executionTime: '2026-03-20T10:22:00.000Z',
        note: '8EMA touch with sellers drying up',
        createdAt: '2026-03-20T10:22:00.000Z',
        updatedAt: '2026-03-20T10:22:00.000Z',
      },
      {
        id: 'seed-mar20-aapl-e2',
        setupId: 'seed-mar20-aapl',
        actionType: 'exit',
        price: 197.8,
        size: 75,
        executionTime: '2026-03-20T10:48:00.000Z',
        note: 'Exit at HOD — momentum fading',
        createdAt: '2026-03-20T10:48:00.000Z',
        updatedAt: '2026-03-20T10:48:00.000Z',
      },
    ],
    createdAt: '2026-03-20T10:15:00.000Z',
    updatedAt: '2026-03-20T10:48:00.000Z',
  },

  // ── March 19 (Wed) ── TSLA Reversal short, full exit
  {
    id: 'seed-mar19-tsla',
    setupDate: '2026-03-19',
    symbol: 'TSLA',
    direction: 'short',
    marketContext: 'downtrend',
    setupType: 'VWAP Reject',
    trigger: 'Rejection at VWAP with heavy volume; lower highs on 5m',
    invalidation: 'Reclaim VWAP / higher high',
    decisionTarget: 'LOD / flush',
    riskEntry: '264.5',
    riskStop: '265.2',
    riskTarget: '262',
    initialGrade: 'A+',
    status: 'closed',
    overallNotes: 'Cover half at -1R, let rest trail VWAP.',
    review: {
      followedPlan: true,
      wentWell: 'Read the tape well. Held through small rip at 264.50 — VWAP rejection confirmed thesis.',
      failed: 'Covered too early on the second trim. Should have let it work further.',
      lesson: 'On high-conviction shorts with strong context, honor the trail rather than locking in early.',
    },
    executions: [
      {
        id: 'seed-mar19-tsla-e1',
        setupId: 'seed-mar19-tsla',
        actionType: 'starter',
        price: 265.0,
        size: 75,
        executionTime: '2026-03-19T10:12:00.000Z',
        note: 'Failed VWAP reclaim with heavy selling',
        createdAt: '2026-03-19T10:12:00.000Z',
        updatedAt: '2026-03-19T10:12:00.000Z',
      },
      {
        id: 'seed-mar19-tsla-e2',
        setupId: 'seed-mar19-tsla',
        actionType: 'add',
        price: 265.8,
        size: 25,
        executionTime: '2026-03-19T10:18:00.000Z',
        note: 'Added on rip into VWAP — confirmed rejection',
        createdAt: '2026-03-19T10:18:00.000Z',
        updatedAt: '2026-03-19T10:18:00.000Z',
      },
      {
        id: 'seed-mar19-tsla-e3',
        setupId: 'seed-mar19-tsla',
        actionType: 'trim',
        price: 264.0,
        size: 50,
        executionTime: '2026-03-19T10:31:00.000Z',
        note: 'First target — prior support',
        createdAt: '2026-03-19T10:31:00.000Z',
        updatedAt: '2026-03-19T10:31:00.000Z',
      },
      {
        id: 'seed-mar19-tsla-e4',
        setupId: 'seed-mar19-tsla',
        actionType: 'exit',
        price: 263.5,
        size: 50,
        executionTime: '2026-03-19T10:44:00.000Z',
        note: 'Full cover — LOD approached',
        createdAt: '2026-03-19T10:44:00.000Z',
        updatedAt: '2026-03-19T10:44:00.000Z',
      },
    ],
    createdAt: '2026-03-19T10:05:00.000Z',
    updatedAt: '2026-03-19T10:44:00.000Z',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveView = 'log' | 'calendar';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [setups, setSetups] = useState<TradeSetup[]>(SEED_SETUPS);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('log');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function logSetup(setup: TradeSetup) {
    setSetups((prev) => [setup, ...prev]);
    setActiveView('log');
  }

  function addExecution(setupId: string, execution: Execution) {
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId
          ? { ...s, executions: [...s.executions, execution], updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  }

  function saveReview(setupId: string, review: SetupReview) {
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId ? { ...s, review, updatedAt: new Date().toISOString() } : s,
      ),
    );
  }

  function updateStatus(setupId: string, status: 'open' | 'closed') {
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
