import type { SessionCandle, SessionChartData } from '@/types/sessionChart';

export const CHART_TIMEFRAMES = [
  { id: '1m', label: '1m', minutes: 1 },
  { id: '5m', label: '5m', minutes: 5 },
  { id: '15m', label: '15m', minutes: 15 },
  { id: '30m', label: '30m', minutes: 30 },
  { id: '1h', label: '1h', minutes: 60 },
] as const;

export type ChartTimeframeId = (typeof CHART_TIMEFRAMES)[number]['id'];

function sortCandles(candles: SessionCandle[]): SessionCandle[] {
  return [...candles].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

/**
 * Groups 1-minute candles into `minutesPerBar`-minute bars aligned to UTC clock boundaries
 * (e.g. 5-min bars always start at :00, :05, :10 …). This ensures bars stay on standard
 * market times even when there are gaps in the source data (thin premarket/aftermarket etc.).
 */
export function aggregateCandlesSequential(
  candles: SessionCandle[],
  minutesPerBar: number
): SessionCandle[] {
  if (minutesPerBar <= 1) return sortCandles(candles);
  const sorted = sortCandles(candles);
  const bucketMs = minutesPerBar * 60 * 1000;

  // Group candles by their clock-aligned bucket key (ms since epoch, truncated to N-min boundary).
  const buckets = new Map<number, SessionCandle[]>();
  for (const candle of sorted) {
    const key = Math.floor(new Date(candle.time).getTime() / bucketMs) * bucketMs;
    const existing = buckets.get(key);
    if (existing) {
      existing.push(candle);
    } else {
      buckets.set(key, [candle]);
    }
  }

  const out: SessionCandle[] = [];
  for (const [, chunk] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    let high = chunk[0].high;
    let low = chunk[0].low;
    let volume = 0;
    let vwapVolSum = 0;
    for (const c of chunk) {
      high = Math.max(high, c.high);
      low = Math.min(low, c.low);
      volume += c.volume;
      vwapVolSum += c.vwap * c.volume;
    }
    const vwap = volume > 0 ? vwapVolSum / volume : chunk[chunk.length - 1].vwap;
    out.push({
      time: chunk[0].time,
      open,
      high,
      low,
      close,
      volume,
      vwap,
      // Preserve the session tag so session-based filtering/coloring still works
      // after resampling. The first candle of the bucket determines the bar's session.
      ...(chunk[0].session ? { session: chunk[0].session } : {}),
    });
  }
  return out;
}

export function applyTimeframeToSession(
  session: SessionChartData,
  timeframe: ChartTimeframeId
): SessionChartData {
  const minutes =
    CHART_TIMEFRAMES.find((t) => t.id === timeframe)?.minutes ?? 1;
  if (minutes <= 1) {
    return {
      ...session,
      candles: sortCandles(session.candles),
    };
  }
  return {
    ...session,
    barSize: `${minutes} min`,
    candles: aggregateCandlesSequential(session.candles, minutes),
  };
}
