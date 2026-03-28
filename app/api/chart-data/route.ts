import { NextRequest, NextResponse } from 'next/server';
import { loadMarketSession } from '@/lib/marketSession';
import { loadTradeMarkers, tradingDateYmdToCompact } from '@/lib/tradeMarkers';

/**
 * GET /api/chart-data?symbol=QQQ&date=2026-03-27
 * Loads `data/market/{symbol}/{date}.json` and optional `data/trades/{symbol}/{YYYYMMDD}-markers.json`.
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const date = req.nextUrl.searchParams.get('date');
  if (!symbol || !date) {
    return NextResponse.json({ error: 'symbol and date are required' }, { status: 400 });
  }

  const sessionResult = await loadMarketSession(symbol, date);
  const compact = tradingDateYmdToCompact(date);
  const tradeResult = await loadTradeMarkers(symbol, compact);

  return NextResponse.json({
    session: sessionResult.ok ? sessionResult.data : null,
    tradeMarkers: tradeResult.ok ? tradeResult.data.markers : null,
  });
}
