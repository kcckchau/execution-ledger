import { NextRequest, NextResponse } from 'next/server';
import { loadMarketSession } from '@/lib/marketSession';
import { prisma } from '@/lib/prisma';
import type { UnifiedChartMarker, SetupMarkerMeta } from '@/types/chartMarker';

/**
 * Returns "YYYY-M-D-H-M" in UTC — used to correlate ChartMarker rows with
 * Execution rows at 1-minute precision.
 */
function toMinuteKey(dt: Date): string {
  return `${dt.getUTCFullYear()}-${dt.getUTCMonth()}-${dt.getUTCDate()}-${dt.getUTCHours()}-${dt.getUTCMinutes()}`;
}

/**
 * GET /api/chart-data?symbol=QQQ&date=2026-03-27
 * Loads market session from filesystem and trade markers from the DB.
 * Markers are enriched with setupId/setupType by joining ChartMarker ↔ Execution
 * at minute+price precision. Returns a setupMeta list of all setups that own
 * at least one marker on that day.
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const date = req.nextUrl.searchParams.get('date');
  if (!symbol || !date) {
    return NextResponse.json({ error: 'symbol and date are required' }, { status: 400 });
  }

  const [sessionResult, dbMarkers, setups] = await Promise.all([
    loadMarketSession(symbol, date),
    prisma.chartMarker.findMany({
      where: { symbol, tradeDate: date },
      orderBy: { executionTime: 'asc' },
    }),
    prisma.tradeSetup.findMany({
      where: { symbol, setupDate: date },
      select: {
        id: true,
        setupType: true,
        executions: { select: { executionTime: true, price: true } },
      },
    }),
  ]);

  // Build a lookup: "minuteKey:price" → { setupId, setupType }
  // Keyed by the Execution's own time+price so we can match IBKR ChartMarker rows.
  const execLookup = new Map<string, { setupId: string; setupType: string }>();
  for (const setup of setups) {
    for (const exec of setup.executions) {
      const key = `${toMinuteKey(exec.executionTime)}:${exec.price.toFixed(2)}`;
      execLookup.set(key, { setupId: setup.id, setupType: setup.setupType });
    }
  }

  // Enrich ChartMarker rows with setup metadata where a match is found.
  const tradeMarkers: UnifiedChartMarker[] = dbMarkers.map((m) => {
    const key = `${toMinuteKey(m.executionTime)}:${m.price.toFixed(2)}`;
    const meta = execLookup.get(key);
    return {
      time: m.executionTime.toISOString(),
      price: m.price,
      shape: m.markerShape as UnifiedChartMarker['shape'],
      color: m.markerColor,
      text: m.markerText,
      setupId: meta?.setupId ?? null,
      setupType: meta?.setupType ?? null,
    };
  });

  // Derive setupMeta from markers that were successfully matched — only setups
  // that actually have IBKR markers are worth showing a toggle for.
  const seenSetups = new Map<string, SetupMarkerMeta>();
  for (const m of tradeMarkers) {
    if (m.setupId && !seenSetups.has(m.setupId)) {
      seenSetups.set(m.setupId, { id: m.setupId, setupType: m.setupType! });
    }
  }
  const setupMeta: SetupMarkerMeta[] | null =
    seenSetups.size > 0 ? [...seenSetups.values()] : null;

  return NextResponse.json({
    session: sessionResult.ok ? sessionResult.data : null,
    tradeMarkers: tradeMarkers.length > 0 ? tradeMarkers : null,
    setupMeta,
  });
}
