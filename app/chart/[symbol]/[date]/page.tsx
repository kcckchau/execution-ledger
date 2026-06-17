'use client';

import { use } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  CrosshairMode,
  ColorType,
  createSeriesMarkers,
  type UTCTimestamp,
  type SeriesMarker,
  type SeriesMarkerShape,
} from 'lightweight-charts';
import type { SessionChartData, SessionCandle } from '@/types/sessionChart';
import type { TradeMarker, SetupMarkerMeta } from '@/types/chartMarker';
import { computeEma } from '@/lib/ema';
import {
  applyTimeframeToSession,
  CHART_TIMEFRAMES,
  type ChartTimeframeId,
} from '@/lib/sessionTimeframe';
import { createSessionTimezoneChartFormatters } from '@/lib/chartTimeLocalization';
import DetectSetupsModal from '@/components/DetectSetupsModal';
import type { SetupDraft } from '@/lib/detectSetups';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChartApiResponse {
  session: (SessionChartData & { prevCandles?: SessionCandle[] | null }) | null;
  tradeMarkers: TradeMarker[] | null;
  setupMeta: SetupMarkerMeta[] | null;
}

type SessionKey = 'pre' | 'reg' | 'post';
type SessionActive = Record<SessionKey, boolean>;

interface OhlcvState {
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  time: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SESSION_TO_TYPE: Record<SessionKey, string> = {
  pre: 'premarket',
  reg: 'regular',
  post: 'aftermarket',
};

const SETUP_PALETTE = [
  '#00d4ff', '#ffd740', '#bb86fc', '#00e676',
  '#ff9800', '#03dac6', '#f06292', '#aed581',
];

const SESSION_BAND_COLORS = {
  premarket:   'rgba(250, 204, 21, 0.09)',
  regular:     'rgba(34, 197, 94, 0.05)',
  aftermarket: 'rgba(139, 92, 246, 0.10)',
} as const;

const LEVEL_LINE_CONFIG = [
  { key: 'premarket_high' as const,    title: 'PM H',  color: '#5090c0', style: LineStyle.Dotted },
  { key: 'premarket_low' as const,     title: 'PM L',  color: '#5090c0', style: LineStyle.Dotted },
  { key: 'regular_high' as const,      title: 'Reg H', color: '#40c080', style: LineStyle.Dotted },
  { key: 'regular_low' as const,       title: 'Reg L', color: '#ff5060', style: LineStyle.Dotted },
  { key: 'opening_range_high' as const, title: 'OR H', color: '#ffd740', style: LineStyle.Dashed },
  { key: 'opening_range_low' as const,  title: 'OR L', color: '#ffd740', style: LineStyle.Dashed },
  { key: 'previous_close' as const,    title: 'Prev C', color: '#94a3b8', style: LineStyle.Dashed },
  { key: 'previous_day_high' as const, title: 'Prev H', color: '#f87171', style: LineStyle.Solid },
  { key: 'previous_day_low' as const,  title: 'Prev L', color: '#4ade80', style: LineStyle.Solid },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toUtcTimestamp(iso: string): UTCTimestamp {
  return Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp;
}

function buildSetupColorMap(setupMeta: SetupMarkerMeta[] | null): Map<string, string> {
  const map = new Map<string, string>();
  (setupMeta ?? []).forEach((m, i) => {
    map.set(m.id, SETUP_PALETTE[i % SETUP_PALETTE.length]);
  });
  return map;
}

function fmtPrice(n: number) {
  return n.toFixed(2);
}

function fmtVol(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ChartPage({
  params,
}: {
  params: Promise<{ symbol: string; date: string }>;
}) {
  const { symbol, date } = use(params);

  const [apiData, setApiData] = useState<ChartApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState<SessionActive>({
    pre: true,
    reg: true,
    post: true,
  });
  const [showTrades, setShowTrades] = useState(true);
  const [timeframe, setTimeframe] = useState<ChartTimeframeId>('1m');
  const [showDetectModal, setShowDetectModal] = useState(false);
  const [ohlcv, setOhlcv] = useState<OhlcvState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    fetch(`/api/chart-data?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ChartApiResponse>;
      })
      .then(setApiData)
      .catch((e) =>
        setFetchError(e instanceof Error ? e.message : 'Failed to load chart data'),
      )
      .finally(() => setLoading(false));
  }, [symbol, date]);

  // ── Chart ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const session = apiData?.session;
    if (!session || !containerRef.current) return;

    const el = containerRef.current;

    // Apply timeframe aggregation first, then filter by active sessions.
    const tfSession = applyTimeframeToSession(session, timeframe);
    const allCandles = [...tfSession.candles].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );

    // Determine which session types are active
    const activeTypes = new Set(
      (Object.keys(SESSION_TO_TYPE) as SessionKey[])
        .filter((k) => sessionActive[k])
        .map((k) => SESSION_TO_TYPE[k]),
    );

    // Candles without a session tag are always shown (legacy flat format)
    const visible = allCandles.filter((c) => !c.session || activeTypes.has(c.session));

    if (visible.length === 0) return;

    const candleData = visible.map((c) => ({
      time: toUtcTimestamp(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volData = visible
      .filter((c) => typeof c.volume === 'number' && c.volume > 0)
      .map((c) => ({
        time: toUtcTimestamp(c.time),
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
      }));

    const vwapData = visible
      .filter((c) => typeof c.vwap === 'number')
      .map((c) => ({ time: toUtcTimestamp(c.time), value: c.vwap }));

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
        background: { type: ColorType.Solid, color: '#0a0b0d' },
        textColor: '#4a5a6a',
        fontSize: 11,
        fontFamily: '"JetBrains Mono", "Geist Mono", ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: '#0f1318' },
        horzLines: { color: '#0f1318' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#2a3a4a', width: 1, style: LineStyle.LargeDashed },
        horzLine: { color: '#2a3a4a', width: 1, style: LineStyle.LargeDashed },
      },
      rightPriceScale: {
        borderColor: '#1e2530',
        scaleMargins: { top: 0.06, bottom: 0.22 },
      },
      timeScale: {
        borderColor: '#1e2530',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 2,
        minBarSpacing: 0.5,
        tickMarkFormatter,
      },
    });

    // Session background bands (premarket / regular / aftermarket)
    const sessionGroups: Record<keyof typeof SESSION_BAND_COLORS, UTCTimestamp[]> = {
      premarket: [],
      regular: [],
      aftermarket: [],
    };
    for (const c of visible) {
      if (c.session === 'premarket') sessionGroups.premarket.push(toUtcTimestamp(c.time));
      else if (c.session === 'regular') sessionGroups.regular.push(toUtcTimestamp(c.time));
      else if (c.session === 'aftermarket') sessionGroups.aftermarket.push(toUtcTimestamp(c.time));
    }
    let bandScaleConfigured = false;
    for (const key of ['premarket', 'regular', 'aftermarket'] as const) {
      const times = sessionGroups[key];
      if (times.length === 0) continue;
      const bandSeries = chart.addSeries(HistogramSeries, {
        color: SESSION_BAND_COLORS[key],
        priceScaleId: 'session-bands',
        priceLineVisible: false,
        lastValueVisible: false,
        base: 0,
      });
      if (!bandScaleConfigured) {
        bandSeries.priceScale().applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });
        bandScaleConfigured = true;
      }
      bandSeries.setData(times.map((t) => ({ time: t, value: 1 })));
    }

    // Volume histogram
    if (volData.length > 0) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceScaleId: 'volume',
        priceLineVisible: false,
        lastValueVisible: false,
        base: 0,
      });
      volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, visible: false });
      volSeries.setData(volData);
    }

    // EMA 9 / EMA 21
    const closes = visible.map((c) => c.close);
    const ema9Values = computeEma(closes, 9);
    const ema21Values = computeEma(closes, 21);
    const ema9Data = visible
      .map((c, i) => ({ time: toUtcTimestamp(c.time), value: ema9Values[i] }))
      .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null);
    const ema21Data = visible
      .map((c, i) => ({ time: toUtcTimestamp(c.time), value: ema21Values[i] }))
      .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null);

    // VWAP line
    const vwapSeries = chart.addSeries(LineSeries, {
      color: 'rgba(255,255,255,0.75)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'VWAP',
    });
    vwapSeries.setData(vwapData);

    const ema9Series = chart.addSeries(LineSeries, {
      color: '#22d3ee',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'EMA 9',
    });
    ema9Series.setData(ema9Data);

    const ema21Series = chart.addSeries(LineSeries, {
      color: '#eab308',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'EMA 21',
    });
    ema21Series.setData(ema21Data);

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00e676',
      downColor: '#ff3d5a',
      borderVisible: false,
      wickUpColor: '#00a050',
      wickDownColor: '#c02040',
    });
    candleSeries.setData(candleData);

    // Level lines
    for (const { key, title, color, style } of LEVEL_LINE_CONFIG) {
      const price = session.levels[key];
      if (typeof price !== 'number' || !Number.isFinite(price)) continue;
      candleSeries.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: style,
        axisLabelVisible: true,
        title,
      });
    }

    // Trade markers — color per setupId
    const tradeMarkers = apiData?.tradeMarkers;
    if (showTrades && tradeMarkers && tradeMarkers.length > 0) {
      const colorMap = buildSetupColorMap(apiData?.setupMeta ?? null);
      const VALID_SHAPES = new Set(['circle', 'square', 'arrowUp', 'arrowDown']);

      const seriesMarkers: SeriesMarker<UTCTimestamp>[] = tradeMarkers.map((m) => {
        const shape: SeriesMarkerShape = VALID_SHAPES.has(m.shape)
          ? (m.shape as SeriesMarkerShape)
          : 'circle';
        const color = m.setupId ? (colorMap.get(m.setupId) ?? m.color) : m.color;
        return {
          time: toUtcTimestamp(m.time),
          position:
            shape === 'arrowUp'
              ? 'atPriceBottom'
              : shape === 'arrowDown'
                ? 'atPriceTop'
                : 'atPriceMiddle',
          price: m.price,
          shape,
          color,
          text: m.text,
          size: 1,
        };
      });

      createSeriesMarkers(candleSeries, seriesMarkers, { autoScale: true });
    }

    // OHLCV crosshair updates
    const volMap = new Map(volData.map((v) => [v.time, v.value]));

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setOhlcv(null);
        return;
      }
      const bar = param.seriesData?.get(candleSeries);
      if (!bar || !('open' in bar)) return;
      setOhlcv({
        o: bar.open as number,
        h: bar.high as number,
        l: bar.low as number,
        c: bar.close as number,
        v: volMap.get(param.time as UTCTimestamp),
        time: param.time as number,
      });
    });

    // Fit to visible content
    requestAnimationFrame(() => {
      chart.timeScale().fitContent();
    });

    return () => {
      chart.remove();
    };
  }, [apiData, sessionActive, showTrades, timeframe]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const session = apiData?.session;
  const setupMeta = apiData?.setupMeta;
  const levels = session?.levels;

  const setupColorMap = buildSetupColorMap(setupMeta ?? null);

  function toggleSession(key: SessionKey) {
    setSessionActive((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function confirmDetectedSetup(draft: SetupDraft): Promise<void> {
    const res = await fetch('/api/setups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? 'Failed to create setup');
    }
  }

  const totalCandles = session?.candles.length ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0b0d]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e2530] border-t-[#00d4ff]" />
          <span className="font-mono text-xs text-[#4a5a6a]">
            Loading {symbol} · {date}
          </span>
        </div>
      </div>
    );
  }

  if (fetchError || !session) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#0a0b0d]">
        <span className="font-mono text-2xl text-[#2a3540]">◈</span>
        <p className="font-mono text-sm text-[#4a5a6a]">
          {fetchError ?? 'No session data found for this date.'}
        </p>
        <Link
          href="/"
          className="font-mono text-xs text-[#4a5a6a] underline-offset-4 hover:text-[#00d4ff] hover:underline"
        >
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: '#0a0b0d', color: '#c8d4e0', fontFamily: '"JetBrains Mono", "Geist Mono", ui-monospace, monospace', fontSize: '12px' }}
    >
      {/* ── Header ── */}
      <div
        className="flex shrink-0 items-center gap-4 px-4 py-2.5"
        style={{ background: '#0f1114', borderBottom: '1px solid #1e2530' }}
      >
        <Link
          href="/"
          className="shrink-0 text-xs transition-colors"
          style={{ color: '#4a5a6a' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#00d4ff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#4a5a6a')}
        >
          ← Back
        </Link>

        <div
          className="shrink-0 font-bold tracking-wide"
          style={{ fontFamily: '"Syne", sans-serif', fontSize: '18px', color: '#fff' }}
        >
          {symbol}
        </div>
        <span style={{ color: '#4a5a6a', fontSize: '11px' }}>{date}</span>

        {/* Timeframe buttons */}
        <div className="flex rounded overflow-hidden" style={{ border: '1px solid #252d38' }}>
          {CHART_TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => setTimeframe(tf.id)}
              className="px-2.5 py-1 text-[10px] font-medium tracking-widest transition-all"
              style={
                timeframe === tf.id
                  ? { background: '#1e2c38', color: '#00d4ff', borderRight: '1px solid #252d38' }
                  : { background: 'transparent', color: '#4a5a6a', borderRight: '1px solid #252d38' }
              }
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Detect Setups */}
        <button
          type="button"
          onClick={() => setShowDetectModal(true)}
          className="rounded px-2.5 py-1 text-[10px] font-medium tracking-widest transition-all"
          style={{ background: '#111418', color: '#818cf8', border: '1px solid #2a2a40' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a40'; }}
        >
          DETECT
        </button>

        {/* Trades toggle */}
        <button
          type="button"
          onClick={() => setShowTrades((v) => !v)}
          className="ml-auto rounded px-2.5 py-1 text-[10px] font-medium tracking-widest transition-all"
          style={
            showTrades
              ? { background: '#1a2a1a', color: '#60e090', border: '1px solid #30804a' }
              : { background: '#111418', color: '#3a4a3a', border: '1px solid #1e2820' }
          }
        >
          TRADES
        </button>

        {/* Session toggles */}
        <div className="flex gap-1.5">
          {(
            [
              { key: 'pre' as const, label: 'PRE' },
              { key: 'reg' as const, label: 'REG' },
              { key: 'post' as const, label: 'POST' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSession(key)}
              className="rounded px-2.5 py-1 text-[10px] font-medium tracking-widest transition-all"
              style={
                sessionActive[key]
                  ? key === 'pre'
                    ? { background: '#1a3050', color: '#80c0ff', border: '1px solid #3060a0' }
                    : key === 'reg'
                      ? { background: '#0d3020', color: '#60e090', border: '1px solid #208050' }
                      : { background: '#20102e', color: '#c090ff', border: '1px solid #6030a0' }
                  : key === 'pre'
                    ? { background: '#0d1a28', color: '#5090c0', border: '1px solid #2a4060' }
                    : key === 'reg'
                      ? { background: '#081510', color: '#40c080', border: '1px solid #1a4030' }
                      : { background: '#120a1e', color: '#9060c0', border: '1px solid #30204a' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OHLCV bar ── */}
      <div
        className="flex shrink-0 items-center gap-5 px-4 py-1.5"
        style={{ background: '#0f1114', borderBottom: '1px solid #1e2530', minHeight: '30px' }}
      >
        {ohlcv ? (
          <>
            {[
              { label: 'O', val: fmtPrice(ohlcv.o), cls: 'neutral' },
              { label: 'H', val: fmtPrice(ohlcv.h), cls: 'green' },
              { label: 'L', val: fmtPrice(ohlcv.l), cls: 'red' },
              { label: 'C', val: fmtPrice(ohlcv.c), cls: ohlcv.c >= ohlcv.o ? 'green' : 'red' },
            ].map(({ label, val, cls }) => (
              <span key={label} className="flex items-baseline gap-1.5">
                <span style={{ color: '#2a3540', fontSize: '10px' }}>{label}</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: cls === 'green' ? '#00e676' : cls === 'red' ? '#ff3d5a' : '#c8d4e0',
                  }}
                >
                  {val}
                </span>
              </span>
            ))}
            {(() => {
              const chg = ohlcv.c - ohlcv.o;
              const pct = ((chg / ohlcv.o) * 100).toFixed(2);
              const isUp = chg >= 0;
              return (
                <span className="flex items-baseline gap-1.5">
                  <span style={{ color: '#2a3540', fontSize: '10px' }}>CHG</span>
                  <span
                    style={{ fontSize: '11px', color: isUp ? '#00e676' : '#ff3d5a' }}
                  >
                    {isUp ? '+' : ''}{chg.toFixed(2)} ({isUp ? '+' : ''}{pct}%)
                  </span>
                </span>
              );
            })()}
            {ohlcv.v !== undefined && (
              <span className="flex items-baseline gap-1.5">
                <span style={{ color: '#2a3540', fontSize: '10px' }}>VOL</span>
                <span style={{ fontSize: '12px', color: '#c8d4e0' }}>{fmtVol(ohlcv.v)}</span>
              </span>
            )}
            <span className="ml-auto font-mono text-[10px]" style={{ color: '#00d4ff' }}>
              {new Date(ohlcv.time * 1000).toLocaleTimeString('en-US', {
                timeZone: session.timezone?.trim() || 'America/New_York',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </span>
          </>
        ) : (
          <span style={{ color: '#2a3540', fontSize: '10px' }}>
            Hover over chart to see OHLCV data
          </span>
        )}
      </div>

      {/* ── Main (sidebar + chart) ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="flex w-44 shrink-0 flex-col overflow-y-auto"
          style={{ background: '#0f1114', borderRight: '1px solid #1e2530' }}
        >
          {/* Levels */}
          <div className="border-b p-3" style={{ borderColor: '#1e2530' }}>
            <div
              className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: '#2a3540' }}
            >
              Levels
            </div>
            {levels && (
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'PM High', key: 'premarket_high' as const, cls: 'pre' },
                  { label: 'PM Low',  key: 'premarket_low' as const,  cls: 'pre' },
                  { label: 'Reg High', key: 'regular_high' as const,  cls: 'high' },
                  { label: 'Reg Low',  key: 'regular_low' as const,   cls: 'low' },
                  { label: 'OR High',  key: 'opening_range_high' as const, cls: 'or' },
                  { label: 'OR Low',   key: 'opening_range_low' as const,  cls: 'or' },
                  { label: 'AH High',  key: 'aftermarket_high' as const, cls: 'high' },
                  { label: 'AH Low',   key: 'aftermarket_low' as const,  cls: 'low' },
                  { label: 'Prev C',   key: 'previous_close' as const,  cls: 'muted' },
                  { label: 'Prev H',   key: 'previous_day_high' as const, cls: 'high' },
                  { label: 'Prev L',   key: 'previous_day_low' as const,  cls: 'low' },
                ].map(({ label, key, cls }) => {
                  const val = levels[key];
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span style={{ fontSize: '10px', color: '#4a5a6a' }}>{label}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color:
                            val == null
                              ? '#2a3540'
                              : cls === 'high'
                                ? '#00e676'
                                : cls === 'low'
                                  ? '#ff3d5a'
                                  : cls === 'or'
                                    ? '#ffd740'
                                    : cls === 'pre'
                                      ? '#5090c0'
                                      : '#4a5a6a',
                        }}
                      >
                        {val != null ? fmtPrice(val) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session stats */}
          <div className="border-b p-3" style={{ borderColor: '#1e2530' }}>
            <div
              className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: '#2a3540' }}
            >
              Session Stats
            </div>
            <div className="flex flex-col gap-2">
              {(
                [
                  { key: 'premarket' as const, label: 'Pre', color: '#5090c0' },
                  { key: 'regular' as const,   label: 'Reg', color: '#40c080' },
                  { key: 'aftermarket' as const, label: 'Post', color: '#9060c0' },
                ] as const
              ).map(({ key, label, color }) => {
                const sessionCandles = session.candles.filter((c) => c.session === key);
                if (sessionCandles.length === 0) return null;
                const first = sessionCandles[0];
                const last = sessionCandles[sessionCandles.length - 1];
                const chg = last.close - first.open;
                const pct = ((chg / first.open) * 100).toFixed(2);
                const isUp = chg >= 0;
                return (
                  <div key={key}>
                    <div style={{ color, fontSize: '9px', letterSpacing: '0.1em', marginBottom: '2px' }}>
                      {label}
                    </div>
                    <div style={{ color: isUp ? '#00e676' : '#ff3d5a', fontSize: '11px' }}>
                      {isUp ? '+' : ''}{chg.toFixed(2)} ({isUp ? '+' : ''}{pct}%)
                    </div>
                    <div style={{ color: '#2a3540', fontSize: '9px' }}>{sessionCandles.length} bars</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Setup legend */}
          {setupMeta && setupMeta.length > 0 && (
            <div className="p-3">
              <div
                className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: '#2a3540' }}
              >
                Setups
              </div>
              <div className="flex flex-col gap-2">
                {setupMeta.map((m) => {
                  const color = setupColorMap.get(m.id) ?? '#4a5a6a';
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <div
                        className="shrink-0 rounded-sm"
                        style={{ width: '8px', height: '8px', background: color }}
                      />
                      <span
                        className="truncate text-[10px]"
                        style={{ color: '#c8d4e0' }}
                        title={m.setupName ?? m.setupType}
                      >
                        {m.setupName ?? m.setupType}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <div
            ref={containerRef}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex shrink-0 items-center gap-5 px-4 py-1"
        style={{
          background: '#0f1114',
          borderTop: '1px solid #1e2530',
          fontSize: '10px',
          color: '#2a3540',
        }}
      >
        <div
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: '#00e676' }}
        />
        <span>
          {symbol} · {date}
        </span>
        <span className="ml-auto">{totalCandles} bars total</span>
      </div>

      <DetectSetupsModal
        open={showDetectModal}
        onClose={() => setShowDetectModal(false)}
        defaultDate={date}
        onConfirm={confirmDetectedSetup}
      />
    </div>
  );
}
