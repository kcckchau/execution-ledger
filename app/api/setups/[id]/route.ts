import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapSetup, mapDayContext } from '@/lib/mappers';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const row = await prisma.tradeSetup.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.review !== undefined && { review: body.review }),
        ...(body.overallNotes !== undefined && { overallNotes: body.overallNotes }),
        ...(body.symbol !== undefined && { symbol: String(body.symbol).trim().toUpperCase() }),
        ...(body.setupDate !== undefined && { setupDate: body.setupDate }),
        ...(body.direction !== undefined && { direction: body.direction }),
        ...(body.setupType !== undefined && { setupType: body.setupType }),
        ...(body.trigger !== undefined && { trigger: String(body.trigger).trim() }),
        ...(body.invalidation !== undefined && { invalidation: String(body.invalidation).trim() }),
        ...(body.decisionTarget !== undefined && { decisionTarget: String(body.decisionTarget).trim() }),
        ...(body.riskEntry !== undefined && { riskEntry: String(body.riskEntry).trim() }),
        ...(body.riskStop !== undefined && { riskStop: String(body.riskStop).trim() }),
        ...(body.riskTarget !== undefined && { riskTarget: String(body.riskTarget).trim() }),
        ...(body.initialGrade !== undefined && { initialGrade: body.initialGrade || null }),
        ...(body.setupName !== undefined && { setupName: body.setupName || null }),
      },
      include: { executions: { orderBy: { executionTime: 'asc' } } },
    });

    // Return setup enriched with day context.
    const dayCtx = await prisma.dayContext.findUnique({ where: { date: row.setupDate } });
    return NextResponse.json(mapSetup(row, dayCtx ? mapDayContext(dayCtx) : null));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.tradeSetup.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
