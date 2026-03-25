import { type Execution, type Direction } from '@/types/setup';

export interface PnlSummary {
  avgEntry: number | null;
  avgExit: number | null;
  totalEntrySize: number;
  totalExitSize: number;
  openSize: number;
  realizedPnl: number;
}

export function calcSetupPnl(executions: Execution[], direction: Direction): PnlSummary {
  const entries = executions.filter(
    (e) => e.actionType === 'starter' || e.actionType === 'add',
  );
  const exits = executions.filter(
    (e) => e.actionType === 'trim' || e.actionType === 'exit',
  );

  const totalEntrySize = entries.reduce((s, e) => s + e.size, 0);
  const totalExitSize = exits.reduce((s, e) => s + e.size, 0);

  if (totalEntrySize === 0) {
    return {
      avgEntry: null,
      avgExit: null,
      totalEntrySize: 0,
      totalExitSize: 0,
      openSize: 0,
      realizedPnl: 0,
    };
  }

  const avgEntry =
    entries.reduce((s, e) => s + e.price * e.size, 0) / totalEntrySize;

  const avgExit =
    totalExitSize > 0
      ? exits.reduce((s, e) => s + e.price * e.size, 0) / totalExitSize
      : null;

  const realizedPnl = exits.reduce((sum, e) => {
    const diff = direction === 'long' ? e.price - avgEntry : avgEntry - e.price;
    return sum + diff * e.size;
  }, 0);

  return {
    avgEntry,
    avgExit,
    totalEntrySize,
    totalExitSize,
    openSize: Math.max(0, totalEntrySize - totalExitSize),
    realizedPnl,
  };
}

export function formatPnl(pnl: number): string {
  return `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;
}
