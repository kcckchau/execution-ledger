import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { MarketOpportunity } from '@/types/opportunity';

function mapOpp(r: Record<string, unknown>): MarketOpportunity {
  return {
    id: r.id as string,
    symbol: r.symbol as string,
    date: (r.date as Date).toISOString(),
    trueRegime: r.trueRegime as MarketOpportunity['trueRegime'],
    vwapState: r.vwapState as MarketOpportunity['vwapState'],
    dayType: r.dayType as MarketOpportunity['dayType'],
    structure: r.structure as MarketOpportunity['structure'],
    setupType: r.setupType as MarketOpportunity['setupType'],
    triggerType: (r.triggerType as MarketOpportunity['triggerType']) ?? null,
    direction: r.direction as MarketOpportunity['direction'],
    alignment: (r.alignment as MarketOpportunity['alignment']) ?? null,
    outcome: (r.outcome as MarketOpportunity['outcome']) ?? null,
    maxFavorable: (r.maxFavorable as number | null) ?? null,
    maxAdverse: (r.maxAdverse as number | null) ?? null,
    taken: r.taken as boolean,
    missReason: (r.missReason as MarketOpportunity['missReason']) ?? null,
    notes: (r.notes as string | null) ?? null,
    qualityScore: (r.qualityScore as number | null) ?? null,
    isAPlus: (r.isAPlus as boolean | null) ?? null,
    createdAt: (r.createdAt as Date).toISOString(),
    updatedAt: (r.updatedAt as Date).toISOString(),
  };
}

/** GET /api/opportunities?date=YYYY-MM-DD&symbol=X */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const date = searchParams.get('date');
    const symbol = searchParams.get('symbol');

    const where: Record<string, unknown> = {};
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      where.date = { gte: start, lte: end };
    }
    if (symbol) where.symbol = symbol.toUpperCase();

    const rows = await prisma.marketOpportunity.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(rows.map(mapOpp));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/opportunities */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const row = await prisma.marketOpportunity.create({
      data: {
        symbol: String(body.symbol).trim().toUpperCase(),
        date: new Date(body.date),
        trueRegime: body.trueRegime,
        vwapState: body.vwapState,
        dayType: body.dayType,
        structure: body.structure,
        setupType: body.setupType,
        triggerType: body.triggerType ?? null,
        direction: body.direction,
        alignment: body.alignment ?? null,
        outcome: body.outcome ?? null,
        maxFavorable: body.maxFavorable ?? null,
        maxAdverse: body.maxAdverse ?? null,
        taken: body.taken ?? false,
        missReason: body.missReason ?? null,
        notes: body.notes ?? null,
        qualityScore: body.qualityScore ?? null,
        isAPlus: body.isAPlus ?? null,
      },
    });

    return NextResponse.json(mapOpp(row as unknown as Record<string, unknown>), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
