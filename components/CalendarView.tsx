'use client';

import { useState, useMemo } from 'react';
import { type TradeSetup } from '@/types/setup';
import { formatPnl } from '@/lib/pnl';
import {
  getTodayInEasternTime,
  getCalendarDays,
  getDaySummaries,
  type DaySummary,
  DAY_HEADERS,
  MONTH_NAMES,
} from '@/lib/dateUtils';

interface CalendarViewProps {
  setups: TradeSetup[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  selectedAccount: string | null;
  onSelectAccount: (account: string | null) => void;
  selectedSecType: string | null;
  onSelectSecType: (secType: string | null) => void;
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string | null) => void;
}

interface CellProps {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  summary: DaySummary | undefined;
  onClick: () => void;
}

function CalendarCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  summary,
  onClick,
}: CellProps) {
  const day = parseInt(date.split('-')[2], 10);
  const setupTotal =
    summary !== undefined
      ? summary.setupCountExecuted + summary.setupCountIdeal
      : 0;
  const hasTrades = summary !== undefined && setupTotal > 0;
  const ex = summary?.realizedPnlExecuted ?? 0;
  const idPnl = summary?.realizedPnlIdeal ?? 0;
  const isPositive = hasTrades && ex > 0;
  const isNegative = hasTrades && ex < 0;
  const isFlatExec = hasTrades && ex === 0;
  const onlyIdealPnl = hasTrades && ex === 0 && idPnl !== 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col p-2 rounded-md border text-left transition-all min-h-[76px]',
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-[#0B0B0C]'
          : '',
        !isCurrentMonth ? 'opacity-30' : '',
        isPositive ? 'bg-emerald-950/50 border-emerald-900/60 hover:bg-emerald-950/70' : '',
        isNegative ? 'bg-rose-950/50 border-rose-900/60 hover:bg-rose-950/70' : '',
        onlyIdealPnl ? 'bg-violet-950/40 border-violet-900/50 hover:bg-violet-950/60' : '',
        isFlatExec && !onlyIdealPnl ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600' : '',
        !hasTrades ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={`text-xs font-medium leading-none ${
          isToday
            ? 'text-indigo-400 font-semibold'
            : isCurrentMonth
            ? 'text-zinc-300'
            : 'text-zinc-700'
        }`}
      >
        {day}
      </span>

      {hasTrades && summary && (
        <div className="mt-auto flex flex-col gap-0.5">
          <span
            className={`text-[11px] tabular-nums font-semibold leading-tight ${
              ex !== 0
                ? ex > 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
                : 'text-zinc-500'
            }`}
            title="Executed P&L"
          >
            {ex === 0 && idPnl === 0 ? '—' : ex !== 0 ? formatPnl(ex) : '—'}
          </span>
          {idPnl !== 0 && (
            <span
              className={`text-[10px] tabular-nums font-medium leading-tight ${
                idPnl > 0 ? 'text-violet-400' : 'text-violet-300/80'
              }`}
              title="Ideal (hypothetical) P&L"
            >
              Id {formatPnl(idPnl)}
            </span>
          )}
          <span className="text-[10px] leading-tight text-zinc-600">
            {summary.setupCountExecuted > 0 && summary.setupCountIdeal > 0
              ? `${summary.setupCountExecuted} ex · ${summary.setupCountIdeal} id`
              : `${setupTotal} setup${setupTotal !== 1 ? 's' : ''}`}
          </span>
        </div>
      )}
    </button>
  );
}

export default function CalendarView({
  setups,
  selectedDate,
  onSelectDate,
  selectedAccount,
  onSelectAccount,
  selectedSecType,
  onSelectSecType,
  selectedSymbol,
  onSelectSymbol,
}: CalendarViewProps) {
  const today = useMemo(() => getTodayInEasternTime(), []);

  const [viewYear, setViewYear] = useState<number>(() =>
    parseInt(today.split('-')[0], 10),
  );
  const [viewMonth, setViewMonth] = useState<number>(() =>
    parseInt(today.split('-')[1], 10),
  );
  const [typedDate, setTypedDate] = useState<string>('');
  const [typedDateError, setTypedDateError] = useState<string | null>(null);

  const accounts = useMemo(() => {
    const seen = new Set<string>();
    for (const s of setups) {
      if (s.acctNumber) seen.add(s.acctNumber);
    }
    return Array.from(seen).sort();
  }, [setups]);

  const secTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const s of setups) {
      if (s.secType) seen.add(s.secType);
    }
    return Array.from(seen).sort();
  }, [setups]);

  // Symbols available given current account + secType selection
  const symbols = useMemo(() => {
    const seen = new Set<string>();
    for (const s of setups) {
      if ((!selectedAccount || s.acctNumber === selectedAccount) &&
          (!selectedSecType || s.secType === selectedSecType)) {
        seen.add(s.symbol);
      }
    }
    return Array.from(seen).sort();
  }, [setups, selectedAccount, selectedSecType]);

  const filteredSetups = useMemo(
    () => setups.filter((s) =>
      (!selectedAccount || s.acctNumber === selectedAccount) &&
      (!selectedSecType || s.secType === selectedSecType) &&
      (!selectedSymbol || s.symbol === selectedSymbol),
    ),
    [setups, selectedAccount, selectedSecType, selectedSymbol],
  );

  const days = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const summaries = useMemo(() => getDaySummaries(filteredSetups), [filteredSetups]);

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayClick(date: string) {
    onSelectDate(selectedDate === date ? null : date);
  }

  function jumpToTypedDate() {
    const raw = typedDate.trim();
    if (!raw) {
      setTypedDateError('Enter a date first');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      setTypedDateError('Use YYYY-MM-DD');
      return;
    }
    const parsed = new Date(`${raw}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
      setTypedDateError('Invalid date');
      return;
    }

    setTypedDateError(null);
    setViewYear(parsed.getUTCFullYear());
    setViewMonth(parsed.getUTCMonth() + 1);
    onSelectDate(raw);
  }

  // Count trade days in the current view month
  const tradeDaysThisMonth = days.filter((d) => {
    const m = parseInt(d.split('-')[1], 10);
    return m === viewMonth && summaries[d] !== undefined;
  }).length;

  const { monthPnlExecuted, monthPnlIdeal } = days
    .filter((d) => {
      const m = parseInt(d.split('-')[1], 10);
      return m === viewMonth && summaries[d] !== undefined;
    })
    .reduce(
      (acc, d) => {
        const s = summaries[d];
        if (!s) return acc;
        return {
          monthPnlExecuted: acc.monthPnlExecuted + s.realizedPnlExecuted,
          monthPnlIdeal: acc.monthPnlIdeal + s.realizedPnlIdeal,
        };
      },
      { monthPnlExecuted: 0, monthPnlIdeal: 0 },
    );

  const hasMonthPnl = tradeDaysThisMonth > 0;
  const hasMonthIdealPnl = hasMonthPnl && monthPnlIdeal !== 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-4">
      {/* ── Header: month nav + summary ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
          >
            ←
          </button>
          <span className="text-sm font-semibold text-white w-36 text-center">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
          >
            →
          </button>
        </div>

        {hasMonthPnl && (
          <div className="text-right space-y-0.5">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Month · Executed
              </p>
              <p
                className={`text-sm font-bold tabular-nums ${
                  monthPnlExecuted >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPnl(monthPnlExecuted)}
              </p>
            </div>
            {hasMonthIdealPnl && (
              <div>
                <p className="text-[10px] text-violet-500/90 uppercase tracking-wider">
                  Ideal
                </p>
                <p
                  className={`text-xs font-semibold tabular-nums ${
                    monthPnlIdeal >= 0 ? 'text-violet-400' : 'text-violet-300'
                  }`}
                >
                  {formatPnl(monthPnlIdeal)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Filters: Account · Type · Symbol ── */}
      {(accounts.length > 1 || secTypes.length > 1 || symbols.length > 1) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {accounts.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">Account</span>
              {[null, ...accounts].map((acct) => (
                <button
                  key={acct ?? 'all'}
                  type="button"
                  onClick={() => onSelectAccount(acct)}
                  className={[
                    'h-7 rounded-md border px-2.5 text-[11px] transition-colors',
                    selectedAccount === acct
                      ? 'border-indigo-600 bg-indigo-950 text-indigo-300'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {acct ?? 'All'}
                </button>
              ))}
            </div>
          )}
          {secTypes.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">Type</span>
              {[null, ...secTypes].map((st) => (
                <button
                  key={st ?? 'all'}
                  type="button"
                  onClick={() => { onSelectSecType(st); onSelectSymbol(null); }}
                  className={[
                    'h-7 rounded-md border px-2.5 text-[11px] transition-colors',
                    selectedSecType === st
                      ? 'border-indigo-600 bg-indigo-950 text-indigo-300'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {st === 'FUT' ? 'Futures' : st === 'STK' ? 'Stocks' : 'All'}
                </button>
              ))}
            </div>
          )}
          {symbols.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-zinc-500">Symbol</span>
              {[null, ...symbols].map((sym) => (
                <button
                  key={sym ?? 'all'}
                  type="button"
                  onClick={() => onSelectSymbol(sym)}
                  className={[
                    'h-7 rounded-md border px-2.5 text-[11px] transition-colors',
                    selectedSymbol === sym
                      ? 'border-indigo-600 bg-indigo-950 text-indigo-300'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {sym ?? 'All'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Typed date jump ── */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] text-zinc-500" htmlFor="calendar-date-input">
          Jump to date
        </label>
        <input
          id="calendar-date-input"
          type="date"
          value={typedDate}
          onChange={(e) => {
            setTypedDate(e.target.value);
            if (typedDateError) setTypedDateError(null);
          }}
          className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none transition-colors focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={jumpToTypedDate}
          className="h-8 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 transition-colors hover:border-indigo-600 hover:text-indigo-300"
        >
          Go
        </button>
        {selectedDate && (
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="h-8 rounded-md border border-zinc-800 px-3 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Clear
          </button>
        )}
        {typedDateError && (
          <span className="text-[11px] text-rose-400">{typedDateError}</span>
        )}
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((h) => (
          <div
            key={h}
            className="text-center text-[11px] font-medium text-zinc-600 py-1"
          >
            {h}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const m = parseInt(date.split('-')[1], 10);
          return (
            <CalendarCell
              key={date}
              date={date}
              isCurrentMonth={m === viewMonth}
              isToday={date === today}
              isSelected={date === selectedDate}
              summary={summaries[date]}
              onClick={() => handleDayClick(date)}
            />
          );
        })}
      </div>
    </div>
  );
}
