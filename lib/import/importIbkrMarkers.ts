import { prisma } from '@/lib/prisma';
import { parseIbkrMarkersFile } from './parseIbkrMarkers';
import {
  normalizeIbkrMarkers,
  compactToIsoDate,
  type NormalizedChartMarker,
} from './normalizeIbkrMarkers';

export interface ImportResult {
  symbol: string;
  tradeDate: string;
  /** Chart markers */
  total: number;
  inserted: number;
  skipped: number;
  /** Ledger (TradeSetup + Execution) */
  setupId: string;
  execInserted: number;
  execSkipped: number;
}

// ── Internals ─────────────────────────────────────────────────────────────────

/**
 * Builds a deterministic, stable ID for the auto-generated TradeSetup so that
 * re-running the import is always idempotent.
 */
function setupIdFor(symbol: string, tradeDate: string): string {
  return `ibkr-${symbol.toLowerCase()}-${tradeDate.replace(/-/g, '')}`;
}

/**
 * Upserts ChartMarker records. Safe to call multiple times.
 */
async function upsertMarkers(records: NormalizedChartMarker[]): Promise<{
  inserted: number;
  skipped: number;
}> {
  if (records.length === 0) return { inserted: 0, skipped: 0 };
  const result = await prisma.chartMarker.createMany({
    data: records,
    skipDuplicates: true,
  });
  return { inserted: result.count, skipped: records.length - result.count };
}

/**
 * Upserts a single TradeSetup (creates on first import; subsequent imports
 * never overwrite so user edits are preserved).
 */
async function upsertTradeSetup(
  setupId: string,
  symbol: string,
  tradeDate: string,
  direction: 'long' | 'short'
): Promise<void> {
  await prisma.tradeSetup.upsert({
    where: { id: setupId },
    update: {},
    create: {
      id: setupId,
      setupDate: tradeDate,
      symbol,
      direction,
      setupType: 'VWAP_RECLAIM',
      trigger: 'Imported from IBKR',
      invalidationType: 'STRUCTURE_BREAK',
      decisionTarget: '',
      riskEntry: '',
      riskStop: '',
      riskTarget: '',
      status: 'closed',
      overallNotes: '',
    },
  });
}

/**
 * Inserts Execution rows linked to the given setup.
 * Each execution gets a deterministic ID derived from the ChartMarker's
 * externalId so re-imports are idempotent via `skipDuplicates`.
 */
async function upsertExecutions(
  setupId: string,
  records: NormalizedChartMarker[]
): Promise<{ inserted: number; skipped: number }> {
  if (records.length === 0) return { inserted: 0, skipped: 0 };

  const data = records.map((r) => ({
    id: `exec-${r.externalId}`,
    setupId,
    actionType: r.executionType,
    price: r.price,
    size: Math.round(r.shares),
    executionTime: r.executionTime,
    note: `${r.side} ${r.shares} sh`,
  }));

  const result = await prisma.execution.createMany({
    data,
    skipDuplicates: true,
  });

  return { inserted: result.count, skipped: records.length - result.count };
}

// ── Delete helpers (used by --replace) ───────────────────────────────────────

/**
 * Deletes all ChartMarker records for (symbol, tradeDate) and the matching
 * auto-generated TradeSetup (including its Executions via cascade).
 * User-created setups (IDs that don't start with "ibkr-") are not touched.
 */
export async function clearIbkrImport(
  symbol: string,
  tradeDate: string
): Promise<void> {
  const setupId = setupIdFor(symbol, tradeDate);

  await prisma.$transaction([
    prisma.chartMarker.deleteMany({ where: { symbol, tradeDate } }),
    prisma.tradeSetup.deleteMany({ where: { id: setupId } }),
  ]);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Full pipeline: read file → parse → normalize → upsert ChartMarkers + TradeSetup + Executions.
 *
 * @param filePath  Absolute or relative path to the markers JSON file.
 * @param symbol    Optional override; defaults to `symbol` field in the file.
 * @param tradeDate Optional YYYY-MM-DD override; derived from `tradeDate` compact field in the file.
 */
export async function importIbkrMarkersFile(
  filePath: string,
  symbol?: string,
  tradeDate?: string
): Promise<ImportResult> {
  const payload = await parseIbkrMarkersFile(filePath);

  const resolvedSymbol = symbol ?? payload.symbol;
  const resolvedDate = tradeDate ?? compactToIsoDate(payload.tradeDate);

  // Derive setupId before normalization so the explicit FK fields
  // (executionId, setupId) can be embedded directly into each ChartMarker record,
  // eliminating the need for approximate minute+price matching at query time.
  const setupId = setupIdFor(resolvedSymbol, resolvedDate);

  const records = normalizeIbkrMarkers(resolvedSymbol, resolvedDate, payload.markers, setupId);

  // 1. Chart markers
  const markerResult = await upsertMarkers(records);
  const firstStarter = records.find((r) => r.executionType === 'starter');
  const direction: 'long' | 'short' = firstStarter?.side === 'SLD' ? 'short' : 'long';

  await upsertTradeSetup(setupId, resolvedSymbol, resolvedDate, direction);
  const execResult = await upsertExecutions(setupId, records);

  return {
    symbol: resolvedSymbol,
    tradeDate: resolvedDate,
    total: records.length,
    inserted: markerResult.inserted,
    skipped: markerResult.skipped,
    setupId,
    execInserted: execResult.inserted,
    execSkipped: execResult.skipped,
  };
}
