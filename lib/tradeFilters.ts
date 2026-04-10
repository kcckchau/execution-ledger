import { calcSetupPnl } from './pnl';
import type { TradeSetup } from '@/types/setup';

// ── Filter state ──────────────────────────────────────────────────────────────

export interface TradeFilters {
  setupType: string[];
  alignment: string[];
  transition: string[];
}

export const EMPTY_FILTERS: TradeFilters = {
  setupType: [],
  alignment: [],
  transition: [],
};

export function isFiltersEmpty(f: TradeFilters): boolean {
  return f.setupType.length === 0 && f.alignment.length === 0 && f.transition.length === 0;
}

export function toggleFilter(
  filters: TradeFilters,
  key: keyof TradeFilters,
  value: string,
): TradeFilters {
  const current = filters[key];
  return {
    ...filters,
    [key]: current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value],
  };
}

// ── Filter logic ──────────────────────────────────────────────────────────────

/**
 * Returns setups that match ALL selected filter categories (AND across categories,
 * OR within a category). Empty category = no constraint for that category.
 */
/**
 * Returns setups that match ALL selected filter categories (AND across categories,
 * OR within a category). Empty category = no constraint for that category.
 * alignment is sourced from TradeSetup directly; transition comes from dayContext.
 */
export function filterTrades(setups: TradeSetup[], filters: TradeFilters): TradeSetup[] {
  if (isFiltersEmpty(filters)) return setups;
  return setups.filter((s) => {
    if (filters.setupType.length > 0 && !filters.setupType.includes(s.setupType)) return false;
    const alignment = s.alignment ?? null;
    const transition = s.dayContext?.transition ?? null;
    if (filters.alignment.length > 0 && (!alignment || !filters.alignment.includes(alignment))) return false;
    if (filters.transition.length > 0 && (!transition || !filters.transition.includes(transition))) return false;
    return true;
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface TradeStats {
  count: number;
  /** Sum of realized P&L on executed (non-ideal) setups */
  totalPnlExecuted: number;
  /** Sum of realized P&L on ideal setups */
  totalPnlIdeal: number;
  /** Executed + ideal (same as totalPnlExecuted + totalPnlIdeal) */
  totalPnl: number;
  /** Wins / (wins + losses). null when no closed trades in set. */
  winRate: number | null;
  /** totalPnl / count. null when no trades. */
  avgPnl: number | null;
}

// ── Grouped stats ─────────────────────────────────────────────────────────────

export interface GroupRow {
  key: string;
  stats: TradeStats;
}

/**
 * Computes stats for each key in `keys`, filtered to only rows that have
 * at least one matching trade. Preserves enum order.
 */
export function computeGroupedStats(
  setups: TradeSetup[],
  getKey: (s: TradeSetup) => string | null | undefined,
  keys: readonly string[],
): GroupRow[] {
  return keys
    .map((key) => ({
      key,
      stats: computeTradeStats(setups.filter((s) => getKey(s) === key)),
    }))
    .filter((row) => row.stats.count > 0);
}

export function computeTradeStats(setups: TradeSetup[]): TradeStats {
  if (setups.length === 0) {
    return {
      count: 0,
      totalPnlExecuted: 0,
      totalPnlIdeal: 0,
      totalPnl: 0,
      winRate: null,
      avgPnl: null,
    };
  }

  const executed = setups.filter((s) => !s.isIdeal);
  const ideal = setups.filter((s) => s.isIdeal);
  const totalPnlExecuted = executed.reduce(
    (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
    0,
  );
  const totalPnlIdeal = ideal.reduce(
    (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
    0,
  );
  const totalPnl = totalPnlExecuted + totalPnlIdeal;

  const pnls = setups.map((s) => calcSetupPnl(s.executions, s.direction).realizedPnl);
  const wins = pnls.filter((p) => p > 0).length;
  const losses = pnls.filter((p) => p < 0).length;
  const denominator = wins + losses;

  return {
    count: setups.length,
    totalPnlExecuted,
    totalPnlIdeal,
    totalPnl,
    winRate: denominator > 0 ? wins / denominator : null,
    avgPnl: totalPnl / setups.length,
  };
}
