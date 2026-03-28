import type { SessionCandle, SessionChartData, SessionLevels } from '@/types/sessionChart';

export interface SessionSliceJson {
  start: string;
  end: string;
  candles: SessionCandle[];
}

/** Raw JSON shape: flat `candles` and/or `sessions` with premarket / regular / aftermarket. */
export interface MarketSessionFileJson {
  symbol: string;
  tradingDate: string;
  timezone: string;
  barSize: string;
  levels: SessionLevels;
  candles?: SessionCandle[];
  sessions?: {
    premarket?: SessionSliceJson;
    regular?: SessionSliceJson;
    aftermarket?: SessionSliceJson;
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
      if (slice?.candles?.length) {
        candles = candles.concat(slice.candles);
      }
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
