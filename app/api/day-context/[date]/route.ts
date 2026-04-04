import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapDayContext } from '@/lib/mappers';

type Params = { params: Promise<{ date: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { date } = await params;
    const ctx = await prisma.dayContext.findUnique({ where: { date } });
    if (!ctx) return NextResponse.json(null);
    return NextResponse.json(mapDayContext(ctx));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { date } = await params;
    const body = await req.json();

    const ctx = await prisma.dayContext.upsert({
      where: { date },
      create: {
        date,
        marketContext: body.marketContext ?? null,
        initialRegime: body.initialRegime ?? null,
        entryRegime: body.entryRegime ?? null,
        transition: body.transition ?? null,
        alignment: body.alignment ?? null,
        notes: body.notes ?? '',
      },
      update: {
        ...(body.marketContext !== undefined && { marketContext: body.marketContext || null }),
        ...(body.initialRegime !== undefined && { initialRegime: body.initialRegime || null }),
        ...(body.entryRegime !== undefined && { entryRegime: body.entryRegime || null }),
        ...(body.transition !== undefined && { transition: body.transition || null }),
        ...(body.alignment !== undefined && { alignment: body.alignment || null }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json(mapDayContext(ctx));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
