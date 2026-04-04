import { NextRequest, NextResponse } from 'next/server';
import { loadMarketSession } from '@/lib/marketSession';
import { prisma } from '@/lib/prisma';
import type { TradeMarker, SetupMarkerMeta } from '@/types/chartMarker';

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

  const [sessionResult, dbMarkers] = await Promise.all([
    loadMarketSession(symbol, date),
    prisma.chartMarker.findMany({
      where: { symbol, tradeDate: date },
      orderBy: { executionTime: 'asc' },
    }),
  ]);

  if (dbMarkers.length === 0) {
    return NextResponse.json({
      session: sessionResult.ok ? sessionResult.data : null,
      tradeMarkers: null,
      setupMeta: null,
    });
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

  const setupTypeMap = new Map(setupRows.map((s) => [s.id, s.setupType as string]));

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

  return NextResponse.json({
    session: sessionResult.ok ? sessionResult.data : null,
    tradeMarkers,
    setupMeta,
  });
}
