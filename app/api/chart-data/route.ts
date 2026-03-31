import { NextRequest, NextResponse } from 'next/server';
import { loadMarketSession } from '@/lib/marketSession';
import { prisma } from '@/lib/prisma';
import type { UnifiedChartMarker } from '@/types/chartMarker';

/**
 * GET /api/chart-data?symbol=QQQ&date=2026-03-27
 * Loads market session from filesystem and trade markers from the DB.
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const date = req.nextUrl.searchParams.get('date');
  if (!symbol || !date) {
    return NextResponse.json({ error: 'symbol and date are required' }, { status: 400 });
  }

  const sessionResult = await loadMarketSession(symbol, date);

  const dbMarkers = await prisma.chartMarker.findMany({
    where: { symbol, tradeDate: date },
    orderBy: { executionTime: 'asc' },
  });

  const tradeMarkers: UnifiedChartMarker[] = dbMarkers.map((m) => ({
    time: m.executionTime.toISOString(),
    price: m.price,
    shape: m.markerShape as UnifiedChartMarker['shape'],
    color: m.markerColor,
    text: m.markerText,
  }));

  return NextResponse.json({
    session: sessionResult.ok ? sessionResult.data : null,
    tradeMarkers: tradeMarkers.length > 0 ? tradeMarkers : null,
  });
}
