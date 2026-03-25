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
  const hasTrades = summary && summary.setupCount > 0;
  const isPositive = hasTrades && summary!.realizedPnl > 0;
  const isNegative = hasTrades && summary!.realizedPnl < 0;
  const isFlat = hasTrades && summary!.realizedPnl === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col p-2 rounded-md border text-left transition-all h-[76px]',
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-[#0B0B0C]'
          : '',
        !isCurrentMonth ? 'opacity-30' : '',
        isPositive ? 'bg-emerald-950/50 border-emerald-900/60 hover:bg-emerald-950/70' : '',
        isNegative ? 'bg-rose-950/50 border-rose-900/60 hover:bg-rose-950/70' : '',
        isFlat ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600' : '',
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

      {hasTrades && (
        <div className="mt-auto flex flex-col gap-0.5">
          <span
            className={`text-xs tabular-nums font-semibold leading-tight ${
              isPositive
                ? 'text-emerald-400'
                : isNegative
                ? 'text-rose-400'
                : 'text-zinc-400'
            }`}
          >
            {summary!.realizedPnl === 0 ? '—' : formatPnl(summary!.realizedPnl)}
          </span>
          <span className="text-[10px] leading-tight text-zinc-600">
            {summary!.setupCount} setup{summary!.setupCount !== 1 ? 's' : ''}
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
}: CalendarViewProps) {
  const today = useMemo(() => getTodayInEasternTime(), []);

  const [viewYear, setViewYear] = useState<number>(() =>
    parseInt(today.split('-')[0], 10),
  );
  const [viewMonth, setViewMonth] = useState<number>(() =>
    parseInt(today.split('-')[1], 10),
  );

  const days = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const summaries = useMemo(() => getDaySummaries(setups), [setups]);

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

  // Count trade days in the current view month
  const tradeDaysThisMonth = days.filter((d) => {
    const m = parseInt(d.split('-')[1], 10);
    return m === viewMonth && summaries[d] !== undefined;
  }).length;

  const monthPnl = days
    .filter((d) => {
      const m = parseInt(d.split('-')[1], 10);
      return m === viewMonth && summaries[d] !== undefined;
    })
    .reduce((sum, d) => sum + (summaries[d]?.realizedPnl ?? 0), 0);

  const hasMonthPnl = tradeDaysThisMonth > 0;

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
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Month P&L
            </p>
            <p
              className={`text-sm font-bold tabular-nums ${
                monthPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatPnl(monthPnl)}
            </p>
          </div>
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
