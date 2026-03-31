import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapSetup } from '@/lib/mappers';

export async function GET() {
  try {
    const rows = await prisma.tradeSetup.findMany({
      include: { executions: { orderBy: { executionTime: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(rows.map(mapSetup));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }
    const ids: string[] = body.ids.filter((id: unknown) => typeof id === 'string');
    await prisma.tradeSetup.deleteMany({ where: { id: { in: ids } } });
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = await prisma.tradeSetup.create({
      data: {
        id: body.id,
        setupDate: body.setupDate,
        symbol: body.symbol,
        direction: body.direction,
        marketContext: body.marketContext,
        setupType: body.setupType,
        trigger: body.trigger,
        invalidation: body.invalidation,
        decisionTarget: body.decisionTarget,
        riskEntry: body.riskEntry,
        riskStop: body.riskStop,
        riskTarget: body.riskTarget,
        initialGrade: body.initialGrade ?? null,
        status: body.status ?? 'open',
        overallNotes: body.overallNotes ?? '',
        review: body.review ?? undefined,
      },
      include: { executions: true },
    });
    return NextResponse.json(mapSetup(row), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
