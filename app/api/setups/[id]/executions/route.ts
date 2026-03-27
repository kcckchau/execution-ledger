import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapExecution } from '@/lib/mappers';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: setupId } = await params;
    const body = await req.json();

    const row = await prisma.execution.create({
      data: {
        id: body.id,
        setupId,
        actionType: body.actionType,
        price: body.price,
        size: body.size,
        executionTime: new Date(body.executionTime),
        note: body.note ?? '',
      },
    });
    return NextResponse.json(mapExecution(row), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
