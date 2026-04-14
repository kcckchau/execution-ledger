import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapExecution } from '@/lib/mappers';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: sourceSetupId } = await params;
    const body = await req.json();

    const targetSetupId =
      typeof body.targetSetupId === 'string' ? body.targetSetupId.trim() : '';
    const execIds = Array.isArray(body.execIds)
      ? body.execIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim() !== '')
      : [];

    if (!targetSetupId) {
      return NextResponse.json({ error: 'targetSetupId is required' }, { status: 400 });
    }
    if (targetSetupId === sourceSetupId) {
      return NextResponse.json({ error: 'targetSetupId must be different from the source setup' }, { status: 400 });
    }
    if (execIds.length === 0) {
      return NextResponse.json({ error: 'execIds must be a non-empty array' }, { status: 400 });
    }

    const [sourceSetup, targetSetup] = await Promise.all([
      prisma.tradeSetup.findUnique({
        where: { id: sourceSetupId },
        select: { id: true, symbol: true, setupDate: true },
      }),
      prisma.tradeSetup.findUnique({
        where: { id: targetSetupId },
        select: { id: true, symbol: true, setupDate: true },
      }),
    ]);

    if (!sourceSetup || !targetSetup) {
      return NextResponse.json({ error: 'Source or target setup not found' }, { status: 404 });
    }

    if (
      sourceSetup.symbol !== targetSetup.symbol ||
      sourceSetup.setupDate !== targetSetup.setupDate
    ) {
      return NextResponse.json(
        { error: 'Executions can only be moved between setups on the same symbol and date' },
        { status: 400 },
      );
    }

    const movedRows = await prisma.$transaction(async (tx) => {
      const existing = await tx.execution.findMany({
        where: { id: { in: execIds }, setupId: sourceSetupId },
      });

      if (existing.length !== execIds.length) {
        throw new Error('One or more executions were not found on the source setup');
      }

      await tx.execution.updateMany({
        where: { id: { in: execIds }, setupId: sourceSetupId },
        data: { setupId: targetSetupId },
      });

      await tx.chartMarker.updateMany({
        where: { executionId: { in: execIds } },
        data: { setupId: targetSetupId },
      });

      return tx.execution.findMany({
        where: { id: { in: execIds }, setupId: targetSetupId },
        orderBy: { executionTime: 'asc' },
      });
    });

    return NextResponse.json(movedRows.map(mapExecution));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
