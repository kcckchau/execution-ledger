import type { SessionCandle, SessionChartData, SessionLevels, SessionType } from '@/types/sessionChart';

type Maybe<T> = T | null | undefined;

export interface RawMarketCandle {
  time?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  vwap?: number | null;
}

export interface SessionSliceJson {
  start?: string;
  end?: string;
  candles?: RawMarketCandle[] | null;
}

/** Supports both the new Python session file and the legacy enriched chart payload. */
export interface MarketSessionFileJson {
  symbol?: string;
  tradingDate?: string;
  timezone?: string | null;
  barSize?: string | null;
  levels?: Partial<SessionLevels> | null;
  candles?: RawMarketCandle[] | null;
  sessions?: {
    premarket?: SessionSliceJson | RawMarketCandle[] | null;
    regular?: SessionSliceJson | RawMarketCandle[] | null;
    aftermarket?: SessionSliceJson | RawMarketCandle[] | null;
  } | null;
}

const DEFAULT_TIMEZONE = 'America/New_York';
const DEFAULT_BAR_SIZE = '1 min';
const SESSION_ORDER: SessionType[] = ['premarket', 'regular', 'aftermarket'];

const EMPTY_LEVELS: SessionLevels = {
  previous_close: null,
  previous_day_high: null,
  previous_day_low: null,
  premarket_high: null,
  premarket_low: null,
  opening_range_high: null,
  opening_range_low: null,
  regular_high: null,
  regular_low: null,
  aftermarket_high: null,
  aftermarket_low: null,
};

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeRawCandle(raw: RawMarketCandle, session?: SessionType): SessionCandle | null {
  const time = safeString(raw.time).trim();
  const open = toFiniteNumber(raw.open);
  const high = toFiniteNumber(raw.high);
  const low = toFiniteNumber(raw.low);
  const close = toFiniteNumber(raw.close);

  if (!time || open === null || high === null || low === null || close === null) {
    return null;
  }

  return {
    time,
    open,
    high,
    low,
    close,
    volume: toFiniteNumber(raw.volume) ?? 0,
    vwap: toFiniteNumber(raw.vwap) ?? close,
    ...(session ? { session } : {}),
  };
}

function sortAndDedupeByTime(candles: SessionCandle[]): SessionCandle[] {
  const sorted = [...candles].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  const byTime = new Map<string, SessionCandle>();
  for (const candle of sorted) {
    byTime.set(candle.time, candle);
  }
  return [...byTime.values()].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

function typicalPrice(candle: Pick<SessionCandle, 'high' | 'low' | 'close'>): number {
  return (candle.high + candle.low + candle.close) / 3;
}

function getCandlesFromSlice(
  slice: Maybe<SessionSliceJson | RawMarketCandle[]>,
  session: SessionType
): SessionCandle[] {
  if (!slice) return [];
  const input = Array.isArray(slice) ? slice : (slice.candles ?? []);
  return input
    .map((candle) => normalizeRawCandle(candle, session))
    .filter((candle): candle is SessionCandle => candle !== null);
}

function timePortion(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? '';
}

function computeSessionVWAP(candles: SessionCandle[]): SessionCandle[] {
  let cumulativeVolume = 0;
  let cumulativePV = 0;

  return candles.map((candle) => {
    const volume = candle.volume > 0 ? candle.volume : 0;
    const price = typicalPrice(candle);
    cumulativeVolume += volume;
    cumulativePV += price * volume;

    return {
      ...candle,
      vwap: cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : price,
    };
  });
}

export function computeRegularVWAP(candles: SessionCandle[]): SessionCandle[] {
  const sorted = sortAndDedupeByTime(candles);
  if (sorted.length === 0) return [];

  const anchorIndex = sorted.findIndex((candle) => timePortion(candle.time) >= '09:30');
  const startIndex = anchorIndex >= 0 ? anchorIndex : 0;

  let cumulativeVolume = 0;
  let cumulativePV = 0;

  return sorted.map((candle, index) => {
    const price = typicalPrice(candle);
    if (index < startIndex) {
      return { ...candle, vwap: price };
    }

    const volume = candle.volume > 0 ? candle.volume : 0;
    cumulativeVolume += volume;
    cumulativePV += price * volume;

    return {
      ...candle,
      vwap: cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : price,
    };
  });
}

export function getHighLow(
  candles: Maybe<SessionCandle[]>
): { high: number | null; low: number | null } {
  if (!candles || candles.length === 0) {
    return { high: null, low: null };
  }

  let high: number | null = null;
  let low: number | null = null;

  for (const candle of candles) {
    if (high === null || candle.high > high) high = candle.high;
    if (low === null || candle.low < low) low = candle.low;
  }

  return { high, low };
}

function getOpeningRange(candles: Maybe<SessionCandle[]>): { high: number | null; low: number | null } {
  const firstThirty = candles?.slice(0, 30) ?? [];
  return getHighLow(firstThirty);
}

function normalizeLevels(levels: Maybe<Partial<SessionLevels>>): Partial<SessionLevels> {
  if (!levels) return {};

  return Object.fromEntries(
    Object.entries(levels).map(([key, value]) => [key, toFiniteNumber(value)])
  ) as Partial<SessionLevels>;
}

export function deriveLevelsFromSessions(sessions: {
  premarket: SessionCandle[];
  regular: SessionCandle[];
  aftermarket: SessionCandle[];
}): Partial<SessionLevels> {
  const premarket = getHighLow(sessions.premarket);
  const regular = getHighLow(sessions.regular);
  const aftermarket = getHighLow(sessions.aftermarket);
  const openingRange = getOpeningRange(sessions.regular);

  return {
    premarket_high: premarket.high,
    premarket_low: premarket.low,
    regular_high: regular.high,
    regular_low: regular.low,
    aftermarket_high: aftermarket.high,
    aftermarket_low: aftermarket.low,
    opening_range_high: openingRange.high,
    opening_range_low: openingRange.low,
  };
}

function mergeLevels(
  rawLevels: Partial<SessionLevels>,
  derivedLevels: Partial<SessionLevels>
): SessionLevels {
  return {
    ...EMPTY_LEVELS,
    ...rawLevels,
    premarket_high: rawLevels.premarket_high ?? derivedLevels.premarket_high ?? null,
    premarket_low: rawLevels.premarket_low ?? derivedLevels.premarket_low ?? null,
    regular_high: rawLevels.regular_high ?? derivedLevels.regular_high ?? null,
    regular_low: rawLevels.regular_low ?? derivedLevels.regular_low ?? null,
    aftermarket_high: rawLevels.aftermarket_high ?? derivedLevels.aftermarket_high ?? null,
    aftermarket_low: rawLevels.aftermarket_low ?? derivedLevels.aftermarket_low ?? null,
    opening_range_high: rawLevels.opening_range_high ?? derivedLevels.opening_range_high ?? null,
    opening_range_low: rawLevels.opening_range_low ?? derivedLevels.opening_range_low ?? null,
  };
}

/**
 * Builds one chronological candle list for the chart from either:
 * - the legacy enriched payload (`candles` + `levels`), or
 * - the new Python session payload (`sessions.premarket|regular|aftermarket`).
 */
export function normalizeMarketSessionFile(raw: MarketSessionFileJson): SessionChartData {
  const sessions = {
    premarket: getCandlesFromSlice(raw.sessions?.premarket, 'premarket'),
    regular: getCandlesFromSlice(raw.sessions?.regular, 'regular'),
    aftermarket: getCandlesFromSlice(raw.sessions?.aftermarket, 'aftermarket'),
  };

  const legacyCandles = (raw.candles ?? [])
    .map((candle) => normalizeRawCandle(candle))
    .filter((candle): candle is SessionCandle => candle !== null);

  const normalizedSessions = {
    premarket: computeSessionVWAP(sortAndDedupeByTime(sessions.premarket)),
    regular: computeRegularVWAP(sessions.regular),
    aftermarket: computeSessionVWAP(sortAndDedupeByTime(sessions.aftermarket)),
  };

  const sessionCandles = SESSION_ORDER.flatMap((session) => normalizedSessions[session]);
  const candles = sortAndDedupeByTime(
    sessionCandles.length > 0 ? sessionCandles : legacyCandles
  );

  const rawLevels = normalizeLevels(raw.levels);
  const derivedLevels = deriveLevelsFromSessions(normalizedSessions);

  return {
    symbol: safeString(raw.symbol),
    tradingDate: safeString(raw.tradingDate),
    timezone: safeString(raw.timezone).trim() || DEFAULT_TIMEZONE,
    barSize: safeString(raw.barSize).trim() || DEFAULT_BAR_SIZE,
    levels: mergeLevels(rawLevels, derivedLevels),
    candles,
  };
}
