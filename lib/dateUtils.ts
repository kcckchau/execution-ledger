import { type TradeSetup } from '@/types/setup';
import { calcSetupPnl } from '@/lib/pnl';

// ─── Eastern Time ─────────────────────────────────────────────────────────────

/**
 * Returns today's calendar date in America/New_York timezone as YYYY-MM-DD.
 * Uses the native Intl API — no external packages needed.
 * This is the correct "trading day" anchor for US equities.
 */
export function getTodayInEasternTime(): string {
  return toEasternDate(new Date());
}

/**
 * Converts any Date instance to its YYYY-MM-DD representation
 * in the America/New_York timezone.
 */
export function toEasternDate(date: Date): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

function easternOffset(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);

  function nthSunday(year: number, month: number, n: number): number {
    const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const firstSun = (7 - firstOfMonth.getUTCDay()) % 7;
    return 1 + firstSun + (n - 1) * 7;
  }

  const dstStart = nthSunday(y, 3, 2);
  const dstEnd = nthSunday(y, 11, 1);

  const inEdt =
    (m === 3 && d >= dstStart) ||
    (m > 3 && m < 11) ||
    (m === 11 && d < dstEnd);

  return inEdt ? '-04:00' : '-05:00';
}

export function easternDateTimeToIso(dateStr: string, timeStr: string): string {
  const offset = easternOffset(dateStr);
  return new Date(`${dateStr}T${timeStr}:00${offset}`).toISOString();
}

export function easternTimeFromIso(iso: string): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h}:${m}`;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** "Mar 24, 2026" from YYYY-MM-DD */
export function formatSetupDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "Mar 24" short form from YYYY-MM-DD */
export function formatSetupDateShort(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

export interface DaySummary {
  date: string; // YYYY-MM-DD
  setups: TradeSetup[];
  /** Realized P&L from executed (non-ideal) setups */
  realizedPnlExecuted: number;
  /** Hypothetical realized P&L from ideal setups */
  realizedPnlIdeal: number;
  setupCountExecuted: number;
  setupCountIdeal: number;
}

export function groupSetupsByDate(setups: TradeSetup[]): Record<string, TradeSetup[]> {
  const map: Record<string, TradeSetup[]> = {};
  for (const setup of setups) {
    const d = setup.setupDate;
    if (!map[d]) map[d] = [];
    map[d].push(setup);
  }
  return map;
}

export function calculateDailyRealizedPnL(
  setups: TradeSetup[],
): Record<string, number> {
  const byDate = groupSetupsByDate(setups);
  const out: Record<string, number> = {};
  for (const [date, group] of Object.entries(byDate)) {
    out[date] = group.reduce(
      (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
      0,
    );
  }
  return out;
}

export function countSetupsByDate(setups: TradeSetup[]): Record<string, number> {
  const byDate = groupSetupsByDate(setups);
  const out: Record<string, number> = {};
  for (const [date, group] of Object.entries(byDate)) {
    out[date] = group.length;
  }
  return out;
}

export function getDaySummaries(
  setups: TradeSetup[],
): Record<string, DaySummary> {
  const byDate = groupSetupsByDate(setups);
  const out: Record<string, DaySummary> = {};
  for (const [date, group] of Object.entries(byDate)) {
    const executed = group.filter((s) => !s.isIdeal);
    const ideal = group.filter((s) => s.isIdeal);
    out[date] = {
      date,
      setups: group,
      realizedPnlExecuted: executed.reduce(
        (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
        0,
      ),
      realizedPnlIdeal: ideal.reduce(
        (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
        0,
      ),
      setupCountExecuted: executed.length,
      setupCountIdeal: ideal.length,
    };
  }
  return out;
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

export const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * Returns an ordered array of YYYY-MM-DD strings covering a full calendar grid
 * (always 35 or 42 cells, starting on Sunday). Includes leading/trailing days
 * from adjacent months so every row is complete.
 */
export function getCalendarDays(year: number, month: number): string[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const startDow = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: string[] = [];

  // Leading days from the previous month
  for (let i = startDow; i > 0; i--) {
    days.push(toYMD(new Date(year, month - 1, 1 - i)));
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${pad(month)}-${pad(d)}`);
  }

  // Trailing days to fill to 35 or 42
  const target = days.length > 35 ? 42 : 35;
  let next = 1;
  while (days.length < target) {
    days.push(toYMD(new Date(year, month, next++)));
  }

  return days;
}

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
