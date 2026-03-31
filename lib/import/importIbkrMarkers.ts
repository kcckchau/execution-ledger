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
  setupIds: string[];
  setupCount: number;
  execInserted: number;
  execSkipped: number;
}

// ── Internals ─────────────────────────────────────────────────────────────────

function setupIdPrefix(symbol: string, tradeDate: string): string {
  return `ibkr-${symbol.toLowerCase()}-${tradeDate.replace(/-/g, '')}`;
}

/**
 * Builds a deterministic, stable ID for each auto-generated TradeSetup so that
 * re-running the import is idempotent while allowing multiple setups per day.
 */
function setupIdFor(symbol: string, tradeDate: string, setupIndex: number): string {
  return `${setupIdPrefix(symbol, tradeDate)}-${String(setupIndex).padStart(2, '0')}`;
}

interface SetupBatch {
  setupId: string;
  direction: 'long' | 'short';
  status: 'open' | 'closed';
  records: NormalizedChartMarker[];
}

/**
 * Split a trading day into flat-to-flat setup batches.
 *
 * This is the best mechanical approximation we can infer from raw executions:
 * when position leaves zero, a setup starts; when position returns to zero, it ends.
 */
function splitIntoSetupBatches(
  symbol: string,
  tradeDate: string,
  records: NormalizedChartMarker[]
): SetupBatch[] {
  if (records.length === 0) return [];

  const sorted = [...records].sort(
    (a, b) => a.executionTime.getTime() - b.executionTime.getTime()
  );

  const batches: SetupBatch[] = [];
  let current: NormalizedChartMarker[] = [];
  let position = 0;
  let batchIndex = 1;

  for (const record of sorted) {
    const delta = record.side === 'BOT' ? record.shares : -record.shares;

    if (current.length === 0) {
      current = [record];
      position = delta;
    } else {
      current.push(record);
      position += delta;
    }

    if (position === 0) {
      const first = current[0];
      batches.push({
        setupId: setupIdFor(symbol, tradeDate, batchIndex++),
        direction: first.side === 'SLD' ? 'short' : 'long',
        status: 'closed',
        records: current,
      });
      current = [];
    }
  }

  if (current.length > 0) {
    const first = current[0];
    batches.push({
      setupId: setupIdFor(symbol, tradeDate, batchIndex++),
      direction: first.side === 'SLD' ? 'short' : 'long',
      status: 'open',
      records: current,
    });
  }

  return batches;
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
  direction: 'long' | 'short',
  status: 'open' | 'closed'
): Promise<void> {
  await prisma.tradeSetup.upsert({
    where: { id: setupId },
    update: {},
    create: {
      id: setupId,
      setupDate: tradeDate,
      symbol,
      direction,
      marketContext: 'range',
      setupType: 'VWAP Reclaim',
      trigger: 'Imported from IBKR',
      invalidation: '',
      decisionTarget: '',
      riskEntry: '',
      riskStop: '',
      riskTarget: '',
      status,
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
  const prefix = setupIdPrefix(symbol, tradeDate);

  await prisma.$transaction([
    prisma.chartMarker.deleteMany({ where: { symbol, tradeDate } }),
    prisma.tradeSetup.deleteMany({
      where: {
        OR: [
          { id: prefix },
          { id: { startsWith: `${prefix}-` } },
        ],
      },
    }),
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

  const records = normalizeIbkrMarkers(resolvedSymbol, resolvedDate, payload.markers);

  // 1. Chart markers
  const markerResult = await upsertMarkers(records);

  // 2. Execution ledger — auto-split into flat-to-flat setup batches
  const setupBatches = splitIntoSetupBatches(resolvedSymbol, resolvedDate, records);

  const setupIds: string[] = [];
  let execInserted = 0;
  let execSkipped = 0;

  for (const batch of setupBatches) {
    await upsertTradeSetup(
      batch.setupId,
      resolvedSymbol,
      resolvedDate,
      batch.direction,
      batch.status
    );
    const execResult = await upsertExecutions(batch.setupId, batch.records);
    setupIds.push(batch.setupId);
    execInserted += execResult.inserted;
    execSkipped += execResult.skipped;
  }

  return {
    symbol: resolvedSymbol,
    tradeDate: resolvedDate,
    total: records.length,
    inserted: markerResult.inserted,
    skipped: markerResult.skipped,
    setupIds,
    setupCount: setupIds.length,
    execInserted,
    execSkipped,
  };
}
