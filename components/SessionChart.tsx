'use client';

import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type Logical,
  type SeriesMarker,
  type SeriesMarkerShape,
  type UTCTimestamp,
} from 'lightweight-charts';
import { createSessionTimezoneChartFormatters } from '@/lib/chartTimeLocalization';
import { computeEma } from '@/lib/ema';
import type { SessionChartData, SessionChartExecutionProp } from '@/types/sessionChart';
import type { TradeMarkerItem } from '@/types/tradeMarkers';
import type { ActionType } from '@/types/setup';

const VWAP_COLOR = '#b8bcc4';
const EMA9_COLOR = '#22d3ee';
const EMA21_COLOR = '#eab308';

const ACTION_MARKER_COLORS: Record<ActionType, string> = {
  starter: '#22c55e',
  add: '#3b82f6',
  trim: '#eab308',
  exit: '#ef4444',
};

const LEVEL_LINE_CONFIG: {
  key: keyof SessionChartData['levels'];
  title: string;
  color: string;
  lineStyle: LineStyle;
}[] = [
  { key: 'previous_close', title: 'Prev close', color: '#94a3b8', lineStyle: LineStyle.Dashed },
  { key: 'previous_day_high', title: 'Prev day H', color: '#f87171', lineStyle: LineStyle.Solid },
  { key: 'previous_day_low', title: 'Prev day L', color: '#4ade80', lineStyle: LineStyle.Solid },
  { key: 'premarket_high', title: 'Pre H', color: '#a78bfa', lineStyle: LineStyle.Solid },
  { key: 'premarket_low', title: 'Pre L', color: '#38bdf8', lineStyle: LineStyle.Solid },
  { key: 'opening_range_high', title: 'OR H', color: '#fb923c', lineStyle: LineStyle.Solid },
  { key: 'opening_range_low', title: 'OR L', color: '#f472b6', lineStyle: LineStyle.Solid },
  { key: 'regular_high', title: 'RTH H', color: '#34d399', lineStyle: LineStyle.Solid },
  { key: 'regular_low', title: 'RTH L', color: '#059669', lineStyle: LineStyle.Solid },
  { key: 'aftermarket_high', title: 'AH H', color: '#c084fc', lineStyle: LineStyle.Solid },
  { key: 'aftermarket_low', title: 'AH L', color: '#a855f7', lineStyle: LineStyle.Solid },
];

function toUtcTimestamp(iso: string): UTCTimestamp {
  return Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp;
}

function normalizeExecution(
  e: SessionChartExecutionProp
): { time: UTCTimestamp; price: number; action: ActionType } {
  const time = 'executionTime' in e ? e.executionTime : e.time;
  const action = 'actionType' in e ? e.actionType : e.action;
  return {
    time: toUtcTimestamp(time),
    price: e.price,
    action,
  };
}

const CHART_MARKER_SHAPES = new Set<string>(['circle', 'square', 'arrowUp', 'arrowDown']);

function tradeMarkerToSeriesMarker(m: TradeMarkerItem): SeriesMarker<UTCTimestamp> {
  const iso = m.minuteTime ?? m.time;
  const shape = CHART_MARKER_SHAPES.has(m.shape)
    ? (m.shape as SeriesMarkerShape)
    : ('circle' as SeriesMarkerShape);
  return {
    time: toUtcTimestamp(iso),
    position: 'atPriceMiddle',
    price: m.price,
    shape,
    color: m.color,
    text: m.text,
    size: 1,
  };
}

export interface SessionChartProps {
  session: SessionChartData;
  /**
   * When defined (including an empty array), IBKR file markers: shape, color, text from payload.
   * When omitted, `executions` drives markers (journal / mock).
   */
  tradeMarkers?: TradeMarkerItem[];
  executions?: SessionChartExecutionProp[];
  /** Extra classes for the outer wrapper (chart is `w-full` × `min-h`). */
  className?: string;
}

export default function SessionChart({
  session,
  tradeMarkers,
  executions = [],
  className = '',
}: SessionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || session.candles.length === 0) return;

    const sorted = [...session.candles].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    const candleData = sorted.map((c) => ({
      time: toUtcTimestamp(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const vwapData = sorted.map((c) => ({
      time: toUtcTimestamp(c.time),
      value: c.vwap,
    }));

    const closes = sorted.map((c) => c.close);
    const ema9SeriesValues = computeEma(closes, 9);
    const ema21SeriesValues = computeEma(closes, 21);

    const ema9Data = sorted
      .map((c, i) => ({
        time: toUtcTimestamp(c.time),
        value: ema9SeriesValues[i],
      }))
      .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null);

    const ema21Data = sorted
      .map((c, i) => ({
        time: toUtcTimestamp(c.time),
        value: ema21SeriesValues[i],
      }))
      .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null);

    const sessionTimeZone = session.timezone?.trim() || 'America/New_York';
    const { timeFormatter, tickMarkFormatter } =
      createSessionTimezoneChartFormatters(sessionTimeZone);

    const chart = createChart(el, {
      autoSize: true,
      localization: {
        locale: 'en-US',
        timeFormatter,
      },
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e11' },
        textColor: '#d1d5db',
        fontSize: 12,
        fontFamily:
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#6b7280', width: 1, style: LineStyle.LargeDashed },
        horzLine: { color: '#6b7280', width: 1, style: LineStyle.LargeDashed },
      },
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 0,
        minBarSpacing: 0.5,
        lockVisibleTimeRangeOnResize: false,
        tickMarkFormatter,
      },
    });

    // Lines first so candlesticks draw on top.
    const vwapSeries = chart.addSeries(LineSeries, {
      color: VWAP_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'VWAP',
    });
    vwapSeries.setData(vwapData);

    const ema9Line = chart.addSeries(LineSeries, {
      color: EMA9_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'EMA 9',
    });
    ema9Line.setData(ema9Data);

    const ema21Line = chart.addSeries(LineSeries, {
      color: EMA21_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'EMA 21',
    });
    ema21Line.setData(ema21Data);

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candleSeries.setData(candleData);

    for (const { key, title, color, lineStyle: ls } of LEVEL_LINE_CONFIG) {
      const price = session.levels[key];
      if (typeof price !== 'number' || !Number.isFinite(price)) continue;
      candleSeries.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: ls,
        axisLabelVisible: true,
        title,
      });
    }

    const markers: SeriesMarker<UTCTimestamp>[] =
      tradeMarkers !== undefined
        ? tradeMarkers.map(tradeMarkerToSeriesMarker)
        : executions.map((raw) => {
            const ex = normalizeExecution(raw);
            return {
              time: ex.time,
              position: 'atPriceMiddle',
              price: ex.price,
              shape: 'circle' as const,
              color: ACTION_MARKER_COLORS[ex.action],
              text: ex.action.charAt(0).toUpperCase(),
              size: 1.2,
            };
          });

    createSeriesMarkers(candleSeries, markers, { autoScale: true });

    const barCount = candleData.length;
    let alive = true;
    const applyFullSessionRange = () => {
      if (!alive) return;
      chart.timeScale().fitContent();
      chart.timeScale().setVisibleLogicalRange({
        from: 0 as Logical,
        to: (barCount - 1) as Logical,
      });
    };

    applyFullSessionRange();
    const rafOuter = requestAnimationFrame(() => {
      applyFullSessionRange();
      requestAnimationFrame(applyFullSessionRange);
    });

    const ro = new ResizeObserver(() => applyFullSessionRange());
    ro.observe(el);

    return () => {
      alive = false;
      cancelAnimationFrame(rafOuter);
      ro.disconnect();
      chart.remove();
    };
  }, [session, executions, tradeMarkers]);

  if (session.candles.length === 0) {
    return (
      <div
        className={`flex min-h-[420px] w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-500 ${className}`}
      >
        No candles for this session
      </div>
    );
  }

  return (
    <div
      className={`relative w-full min-h-[420px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 ${className}`}
    >
      <div ref={containerRef} className="h-[min(70vh,560px)] w-full min-h-[420px]" />
    </div>
  );
}
