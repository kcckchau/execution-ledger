import type { Direction, Execution as SetupExecution } from '@/types/setup';

type Side = 'buy' | 'sell';

interface NormalizedExecution {
  price: number;
  size: number;
  side: Side;
}

interface Lot {
  price: number;
  size: number;
}

export interface PnlSummary {
  avgEntry: number | null;
  avgExit: number | null;
  totalEntrySize: number;
  totalExitSize: number;
  openSize: number;
  realizedPnl: number;
}

function parseImportedSide(note: string): Side | null {
  const prefix = note.trim().split(/\s+/, 1)[0]?.toUpperCase();
  if (prefix === 'BOT') return 'buy';
  if (prefix === 'SLD') return 'sell';
  return null;
}

function normalizeExecution(execution: SetupExecution, direction: Direction): NormalizedExecution {
  const importedSide = parseImportedSide(execution.note);
  if (importedSide) {
    return {
      price: execution.price,
      size: execution.size,
      side: importedSide,
    };
  }

  const opensPosition = execution.actionType === 'starter' || execution.actionType === 'add';
  const side: Side =
    direction === 'long'
      ? opensPosition
        ? 'buy'
        : 'sell'
      : opensPosition
        ? 'sell'
        : 'buy';

  return {
    price: execution.price,
    size: execution.size,
    side,
  };
}

function compareExecutionTime(a: SetupExecution, b: SetupExecution): number {
  return new Date(a.executionTime).getTime() - new Date(b.executionTime).getTime();
}

export function calcSetupPnlFIFO(executions: NormalizedExecution[]): PnlSummary {
  const inventory: Lot[] = [];
  let realizedPnl = 0;

  let totalEntryValue = 0;
  let totalEntrySize = 0;

  let totalExitValue = 0;
  let totalExitSize = 0;

  for (const execution of executions) {
    if (
      !Number.isFinite(execution.price) ||
      execution.price <= 0 ||
      !Number.isFinite(execution.size) ||
      execution.size <= 0
    ) {
      continue;
    }

    const signedSize = execution.side === 'buy' ? execution.size : -execution.size;
    const currentPosition = inventory.reduce((sum, lot) => sum + lot.size, 0);
    const isOpeningTrade =
      currentPosition === 0 ||
      (currentPosition > 0 && signedSize > 0) ||
      (currentPosition < 0 && signedSize < 0);

    if (isOpeningTrade) {
      inventory.push({ price: execution.price, size: signedSize });
      totalEntryValue += execution.price * execution.size;
      totalEntrySize += execution.size;
      continue;
    }

    let remaining = execution.size;

    while (remaining > 0 && inventory.length > 0) {
      const lot = inventory[0];
      const matched = Math.min(remaining, Math.abs(lot.size));

      realizedPnl +=
        lot.size > 0
          ? (execution.price - lot.price) * matched
          : (lot.price - execution.price) * matched;

      totalExitValue += execution.price * matched;
      totalExitSize += matched;

      lot.size += lot.size > 0 ? -matched : matched;
      remaining -= matched;

      if (lot.size === 0) {
        inventory.shift();
      }
    }

    if (remaining > 0) {
      inventory.push({
        price: execution.price,
        size: execution.side === 'buy' ? remaining : -remaining,
      });
      totalEntryValue += execution.price * remaining;
      totalEntrySize += remaining;
    }
  }

  const openSize = Math.abs(inventory.reduce((sum, lot) => sum + lot.size, 0));

  return {
    avgEntry: totalEntrySize > 0 ? totalEntryValue / totalEntrySize : null,
    avgExit: totalExitSize > 0 ? totalExitValue / totalExitSize : null,
    totalEntrySize,
    totalExitSize,
    openSize,
    realizedPnl,
  };
}

export function calcSetupPnl(executions: SetupExecution[], direction: Direction): PnlSummary {
  const normalized = [...executions]
    .sort(compareExecutionTime)
    .map((execution) => normalizeExecution(execution, direction));

  return calcSetupPnlFIFO(normalized);
}

export function formatPnl(value: number): string {
  const abs = Math.abs(value).toFixed(2);
  return value < 0 ? `-$${abs}` : `$${abs}`;
}
