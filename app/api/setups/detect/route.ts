import { NextRequest, NextResponse } from 'next/server';
import { loadMarketSession } from '@/lib/marketSession';
import { detectSetupsFromSession } from '@/lib/detectSetups';

/**
 * POST /api/setups/detect
 *
 * Accepts { symbol: string, date: string (YYYY-MM-DD) }.
 * Loads intraday session data, runs deterministic setup detection, and
 * returns suggested SetupDrafts for user review.
 *
 * Does NOT write anything to the database.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).symbol !== 'string' ||
    typeof (body as Record<string, unknown>).date !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Body must contain { symbol: string, date: string }' },
      { status: 400 },
    );
  }

  const { symbol, date } = body as { symbol: string; date: string };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'date must be in YYYY-MM-DD format' },
      { status: 400 },
    );
  }

  const result = await loadMarketSession(symbol, date);

  if (!result.ok) {
    if (result.reason === 'not_found') {
      return NextResponse.json(
        { error: `No session data found for ${symbol} on ${date}` },
        { status: 404 },
      );
    }
    if (result.reason === 'invalid_args') {
      return NextResponse.json(
        { error: 'Invalid symbol or date format' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to load session data' },
      { status: 500 },
    );
  }

  const suggestions = detectSetupsFromSession(result.data, date, symbol);

  return NextResponse.json({ suggestions, session: result.data });
}
