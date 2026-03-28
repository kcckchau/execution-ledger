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
 * Groups consecutive 1-minute candles into `minutesPerBar`-minute bars (OHLC, summed volume,
 * volume-weighted VWAP over the chunk). First candle time is the aggregated bar open time.
 */
export function aggregateCandlesSequential(
  candles: SessionCandle[],
  minutesPerBar: number
): SessionCandle[] {
  if (minutesPerBar <= 1) return sortCandles(candles);
  const sorted = sortCandles(candles);
  const out: SessionCandle[] = [];
  for (let i = 0; i < sorted.length; i += minutesPerBar) {
    const chunk = sorted.slice(i, i + minutesPerBar);
    if (chunk.length === 0) break;
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
