import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapExecution } from '@/lib/mappers';
import { ACTION_TYPES } from '@/types/setup';

type Params = { params: Promise<{ id: string; execId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id: setupId, execId } = await params;
    const body = await req.json();

    if (!body.actionType || !(ACTION_TYPES as readonly string[]).includes(body.actionType)) {
      return NextResponse.json({ error: 'Invalid actionType' }, { status: 400 });
    }
    const price = Number(body.price);
    const size = Number(body.size);
    if (!isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'price must be a positive number' }, { status: 400 });
    }
    if (!isFinite(size) || size <= 0 || !Number.isInteger(size)) {
      return NextResponse.json({ error: 'size must be a positive integer' }, { status: 400 });
    }
    if (!body.executionTime) {
      return NextResponse.json({ error: 'executionTime is required' }, { status: 400 });
    }
    const executionTime = new Date(body.executionTime);
    if (isNaN(executionTime.getTime())) {
      return NextResponse.json({ error: 'executionTime is not a valid date' }, { status: 400 });
    }

    // Verify the execution belongs to this setup
    const existing = await prisma.execution.findFirst({ where: { id: execId, setupId } });
    if (!existing) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    const row = await prisma.execution.update({
      where: { id: execId },
      data: {
        actionType: body.actionType,
        price,
        size,
        executionTime,
        note: (body.note ?? '').trim(),
      },
    });
    return NextResponse.json(mapExecution(row));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: setupId, execId } = await params;

    const existing = await prisma.execution.findFirst({ where: { id: execId, setupId } });
    if (!existing) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    await prisma.execution.delete({ where: { id: execId } });
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
