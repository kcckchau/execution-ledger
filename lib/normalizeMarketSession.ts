import type { SessionCandle, SessionChartData, SessionLevels, SessionType } from '@/types/sessionChart';

export interface SessionSliceJson {
  start: string;
  end: string;
  candles: SessionCandle[];
}

/** Raw JSON shape: flat `candles` and/or `sessions` with premarket / regular / aftermarket.
 *  Sessions can be either a `SessionSliceJson` object ({ start, end, candles })
 *  or a bare array of candles. */
export interface MarketSessionFileJson {
  symbol: string;
  tradingDate: string;
  timezone: string;
  barSize: string;
  levels: SessionLevels;
  candles?: SessionCandle[];
  sessions?: {
    premarket?: SessionSliceJson | SessionCandle[];
    regular?: SessionSliceJson | SessionCandle[];
    aftermarket?: SessionSliceJson | SessionCandle[];
  };
}

function sortAndDedupeByTime(candles: SessionCandle[]): SessionCandle[] {
  const sorted = [...candles].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  const byTime = new Map<string, SessionCandle>();
  for (const c of sorted) {
    byTime.set(c.time, c);
  }
  return [...byTime.values()].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

/**
 * Builds one chronological candle list for the chart: premarket → regular → aftermarket,
 * or uses top-level `candles` when present (legacy).
 */
export function normalizeMarketSessionFile(raw: MarketSessionFileJson): SessionChartData {
  let candles: SessionCandle[] = [];

  if (raw.candles && raw.candles.length > 0) {
    candles = raw.candles;
  } else if (raw.sessions) {
    const order = ['premarket', 'regular', 'aftermarket'] as const;
    for (const key of order) {
      const slice = raw.sessions[key];
      if (!slice) continue;
      // Sessions can be a bare candle array or a { start, end, candles } object
      const sessionCandles: SessionCandle[] = Array.isArray(slice)
        ? slice
        : (slice.candles ?? []);
      candles = candles.concat(
        sessionCandles.map((c) => ({ ...c, session: key as SessionType }))
      );
    }
  }

  return {
    symbol: raw.symbol,
    tradingDate: raw.tradingDate,
    timezone: raw.timezone,
    barSize: raw.barSize,
    levels: raw.levels,
    candles: sortAndDedupeByTime(candles),
  };
}
