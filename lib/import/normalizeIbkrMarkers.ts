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
 * `tradeDate` should be YYYY-MM-DD (from the file or provided by the caller).
 */
export function normalizeIbkrMarkers(
  symbol: string,
  tradeDate: string,
  markers: TradeMarkerItem[]
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
