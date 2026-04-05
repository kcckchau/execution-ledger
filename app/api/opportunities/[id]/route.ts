import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { MarketOpportunity } from '@/types/opportunity';

type Params = { params: Promise<{ id: string }> };

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

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const row = await prisma.marketOpportunity.update({
      where: { id },
      data: {
        ...(body.symbol !== undefined && { symbol: String(body.symbol).trim().toUpperCase() }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.trueRegime !== undefined && { trueRegime: body.trueRegime }),
        ...(body.vwapState !== undefined && { vwapState: body.vwapState }),
        ...(body.dayType !== undefined && { dayType: body.dayType }),
        ...(body.structure !== undefined && { structure: body.structure }),
        ...(body.setupType !== undefined && { setupType: body.setupType }),
        ...(body.triggerType !== undefined && { triggerType: body.triggerType || null }),
        ...(body.direction !== undefined && { direction: body.direction }),
        ...(body.alignment !== undefined && { alignment: body.alignment || null }),
        ...(body.outcome !== undefined && { outcome: body.outcome || null }),
        ...(body.maxFavorable !== undefined && { maxFavorable: body.maxFavorable ?? null }),
        ...(body.maxAdverse !== undefined && { maxAdverse: body.maxAdverse ?? null }),
        ...(body.taken !== undefined && { taken: body.taken }),
        ...(body.missReason !== undefined && { missReason: body.missReason || null }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.qualityScore !== undefined && { qualityScore: body.qualityScore ?? null }),
        ...(body.isAPlus !== undefined && { isAPlus: body.isAPlus ?? null }),
      },
    });

    return NextResponse.json(mapOpp(row as unknown as Record<string, unknown>));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.marketOpportunity.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
