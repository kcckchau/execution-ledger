import type { TradeMarkerItem } from '@/types/tradeMarkers';

export interface NormalizedChartMarker {
  id: string;
  symbol: string;
  tradeDate: string;
  executionTime: Date;
  side: string;
  shares: number;
  price: number;
  executionType: string;
  positionEffect: string;
  source: 'ibkr';
  externalId: string;
  markerShape: string;
  markerColor: string;
  markerText: string;
  /**
   * Deterministic FK → Execution.id.
   * Formula: `"exec-" + externalId` — matches the ID assigned in upsertExecutions.
   * This eliminates the need for minute+price approximate matching at query time.
   */
  executionId: string;
  /**
   * FK → TradeSetup.id — the auto-generated setup for this (symbol, date).
   * Passed in from the caller who owns the setupId derivation logic.
   */
  setupId: string;
}

/**
 * Builds a deterministic, human-readable external ID for idempotent upserts.
 * Format: {symbol}-{minuteTime}-{side}-{price}-{shares}
 */
function makeExternalId(symbol: string, m: TradeMarkerItem): string {
  const time = (m.minuteTime ?? m.time).replace(/[^0-9T:\-+Z]/g, '');
  return `${symbol}-${time}-${m.side}-${m.price}-${m.shares}`;
}

/**
 * Maps raw IBKR marker objects from the JSON file into DB-ready records.
 *
 * @param symbol     Resolved ticker symbol.
 * @param tradeDate  YYYY-MM-DD.
 * @param markers    Raw markers from the parsed JSON file.
 * @param setupId    The TradeSetup ID that will own these executions.
 *                   Computed by the caller via `setupIdFor(symbol, tradeDate)` so
 *                   the explicit linkage fields are set at normalization time,
 *                   not derived approximately at query time.
 */
export function normalizeIbkrMarkers(
  symbol: string,
  tradeDate: string,
  markers: TradeMarkerItem[],
  setupId: string,
): NormalizedChartMarker[] {
  return markers.map((m) => {
    const externalId = makeExternalId(symbol, m);
    return {
      id: externalId,
      symbol,
      tradeDate,
      executionTime: new Date(m.minuteTime ?? m.time),
      side: m.side,
      shares: m.shares,
      price: m.price,
      executionType: m.executionType,
      positionEffect: m.positionEffect,
      source: 'ibkr' as const,
      externalId,
      markerShape: m.shape,
      markerColor: m.color,
      markerText: m.text,
      // Explicit linkage — no approximate matching needed at read time.
      executionId: `exec-${externalId}`,
      setupId,
    };
  });
}

/**
 * Converts a compact YYYYMMDD date string to YYYY-MM-DD.
 */
export function compactToIsoDate(compact: string): string {
  if (compact.length === 8) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  }
  return compact;
}
