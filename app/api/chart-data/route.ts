import { NextRequest, NextResponse } from 'next/server';
import { loadMarketSession, findPrevTradingDate } from '@/lib/marketSession';
import { prisma } from '@/lib/prisma';
import type { TradeMarker, SetupMarkerMeta } from '@/types/chartMarker';

function normalizeSetupType(value: string | null): string | null {
  if (!value) return null;
  switch (value) {
    case 'VWAP_RECLAIM':
    case 'VWAP_REJECT':
    case 'VWAP_PULLBACK':
      return 'VWAP_PLAY';
    case 'ORB_BREAK':
      return 'BREAKOUT';
    case 'SWEEP_FAIL':
    case 'FAILED_BREAKOUT':
    case 'FAILED_BREAKDOWN':
    case 'FLIP':
      return 'FAILED_MOVE';
    case 'RANGE_RECLAIM':
    case 'RANGE_REJECT':
      return 'RANGE';
    default:
      return value;
  }
}

/**
 * GET /api/chart-data?symbol=QQQ&date=2026-03-27
 *
 * Loads the market session from the filesystem and DB-backed chart markers.
 *
 * Marker → setup linkage uses the explicit `setupId` column on ChartMarker
 * (populated at import time). No minute+price approximate matching is used.
 * For records imported before the 20260403000001 migration the backfill SQL
 * will have populated these columns; any still-null records remain unlinked
 * and are returned with null setupId.
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const date = req.nextUrl.searchParams.get('date');
  if (!symbol || !date) {
    return NextResponse.json({ error: 'symbol and date are required' }, { status: 400 });
  }

  // Kick off all I/O in parallel — prev day lookup + load happen concurrently with today.
  const prevSessionPromise = findPrevTradingDate(symbol, date).then((prevDate) =>
    prevDate ? loadMarketSession(symbol, prevDate) : null,
  );

  const [sessionResult, dbMarkers, prevSession] = await Promise.all([
    loadMarketSession(symbol, date),
    prisma.chartMarker.findMany({
      where: { symbol, tradeDate: date },
      orderBy: { executionTime: 'asc' },
    }),
    prevSessionPromise,
  ]);

  const rawPrevCandles = prevSession?.ok ? prevSession.data.candles : null;

  // Drop prevCandles when there is a large time gap between the previous session
  // and the current session (e.g. a weekend gap for MNQ futures). lightweight-charts
  // renders any gap as a flat horizontal stretch, which makes the chart look broken.
  // We keep prevCandles only when the last prev candle falls within 8 hours of the
  // current session's first candle — enough to cover normal overnight/extended sessions
  // while suppressing the 49-hour Fri→Sun gap that MNQ has on Mondays.
  const currentFirstTime =
    sessionResult.ok && sessionResult.data.candles.length > 0
      ? new Date(sessionResult.data.candles[0].time).getTime()
      : null;

  const prevCandles = (() => {
    if (!rawPrevCandles || rawPrevCandles.length === 0) return null;
    if (currentFirstTime === null) return rawPrevCandles;
    const lastPrevTime = new Date(rawPrevCandles[rawPrevCandles.length - 1].time).getTime();
    const gapMs = currentFirstTime - lastPrevTime;
    const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
    return gapMs > EIGHT_HOURS_MS ? null : rawPrevCandles;
  })();

  // Helper to attach prevCandles to a session payload.
  function withPrev(data: typeof sessionResult) {
    if (!data.ok) return null;
    return { ...data.data, prevCandles: prevCandles ?? null };
  }

  // Historical dates are immutable; today may still have live marker imports.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const isHistorical = date < todayUtc;
  const cacheControl = isHistorical
    ? 'public, max-age=86400, stale-while-revalidate=604800'  // 1 day fresh, 7 days stale
    : 'public, max-age=60, stale-while-revalidate=300';        // 1 min fresh, 5 min stale

  if (dbMarkers.length === 0) {
    return NextResponse.json(
      { session: withPrev(sessionResult), tradeMarkers: null, setupMeta: null },
      { headers: { 'Cache-Control': cacheControl } },
    );
  }

  // Collect distinct setupIds that are explicitly linked (non-null).
  const linkedSetupIds = [...new Set(
    dbMarkers.map((m) => m.setupId).filter((id): id is string => id != null)
  )];

  // Fetch setupType for each linked setup in one query.
  const setupRows = linkedSetupIds.length > 0
    ? await prisma.tradeSetup.findMany({
        where: { id: { in: linkedSetupIds } },
        select: { id: true, setupType: true },
      })
    : [];

  const setupTypeMap = new Map(
    setupRows.map((s) => [s.id, normalizeSetupType(s.setupType as string)])
  );

  // Map ChartMarker rows to the canonical TradeMarker shape.
  const tradeMarkers: TradeMarker[] = dbMarkers.map((m) => ({
    id: m.id,
    time: m.executionTime.toISOString(),
    price: m.price,
    shape: m.markerShape as TradeMarker['shape'],
    color: m.markerColor,
    text: m.markerText,
    action: m.side === 'SLD' ? 'SELL' : 'BUY',
    quantity: m.shares,
    // Explicit linkage — read directly from DB columns, no approximation.
    executionId: m.executionId ?? null,
    setupId: m.setupId ?? null,
    setupType: m.setupId ? (setupTypeMap.get(m.setupId) ?? null) : null,
  }));

  // Derive setupMeta from markers that are actually linked. Preserves the
  // natural order of first appearance (markers are ordered by executionTime asc).
  const seenSetups = new Map<string, SetupMarkerMeta>();
  for (const m of tradeMarkers) {
    if (m.setupId && m.setupType && !seenSetups.has(m.setupId)) {
      seenSetups.set(m.setupId, { id: m.setupId, setupType: m.setupType });
    }
  }
  const setupMeta: SetupMarkerMeta[] | null =
    seenSetups.size > 0 ? [...seenSetups.values()] : null;

  return NextResponse.json(
    { session: withPrev(sessionResult), tradeMarkers, setupMeta },
    { headers: { 'Cache-Control': cacheControl } },
  );
}
