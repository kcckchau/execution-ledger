import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapSetup, mapDayContext, type DbSetup } from '@/lib/mappers';
import { CONTEXTS, LOCATIONS, ENTRY_TRIGGERS, INVALIDATION_TYPES, OUTCOMES, SETUP_RESULTS, MISTAKE_TYPES, MARKET_OUTCOMES } from '@/types/setup';
import type { Context, Location, EntryTrigger, MistakeType as PrismaMistakeType } from '@/lib/generated/prisma/client';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const row = await prisma.tradeSetup.update({
      where: { id },
      data: {
        ...(body.isIdeal !== undefined && { isIdeal: Boolean(body.isIdeal) }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.overallNotes !== undefined && { overallNotes: body.overallNotes }),
        ...(body.symbol !== undefined && { symbol: String(body.symbol).trim().toUpperCase() }),
        ...(body.setupDate !== undefined && { setupDate: body.setupDate }),
        ...(body.direction !== undefined && { direction: body.direction }),
        ...(body.setupType !== undefined && { setupType: body.setupType }),
        ...(body.trigger !== undefined && { trigger: String(body.trigger).trim() }),
        ...(body.decisionTarget !== undefined && { decisionTarget: String(body.decisionTarget).trim() }),
        // Structured invalidation
        ...(body.invalidationType !== undefined && {
          invalidationType: (INVALIDATION_TYPES as readonly string[]).includes(body.invalidationType)
            ? body.invalidationType
            : 'STRUCTURE_BREAK',
        }),
        ...(body.invalidationNote !== undefined && {
          invalidationNote: body.invalidationNote ? String(body.invalidationNote).trim() : null,
        }),
        ...(body.riskEntry !== undefined && { riskEntry: String(body.riskEntry).trim() }),
        ...(body.riskStop !== undefined && { riskStop: String(body.riskStop).trim() }),
        ...(body.riskTarget !== undefined && { riskTarget: String(body.riskTarget).trim() }),
        ...(body.initialGrade !== undefined && { initialGrade: body.initialGrade || null }),
        ...(body.setupName !== undefined && { setupName: body.setupName || null }),
        // 4-part classification
        ...(body.contexts !== undefined && {
          contexts: (Array.isArray(body.contexts)
            ? (body.contexts as string[]).filter((c) => (CONTEXTS as readonly string[]).includes(c))
            : []) as Context[],
        }),
        ...(body.locations !== undefined && {
          locations: (Array.isArray(body.locations)
            ? (body.locations as string[]).filter((l) => (LOCATIONS as readonly string[]).includes(l))
            : []) as Location[],
        }),
        ...(body.entryTrigger !== undefined && {
          entryTrigger: ((ENTRY_TRIGGERS as readonly string[]).includes(body.entryTrigger)
            ? body.entryTrigger
            : null) as EntryTrigger | null,
        }),
        // Layer 2 — market reality
        ...(body.trueRegime !== undefined && { trueRegime: body.trueRegime || null }),
        ...(body.vwapState !== undefined && { vwapState: body.vwapState || null }),
        ...(body.structure !== undefined && { structure: body.structure || null }),
        ...(body.alignment !== undefined && { alignment: body.alignment || null }),
        // Review layer
        ...(body.outcome !== undefined && {
          outcome: (OUTCOMES as readonly string[]).includes(body.outcome) ? body.outcome : null,
        }),
        ...(body.setupResult !== undefined && {
          setupResult: (SETUP_RESULTS as readonly string[]).includes(body.setupResult) ? body.setupResult : null,
        }),
        ...(body.mistakeTypes !== undefined && {
          mistakeTypes: (Array.isArray(body.mistakeTypes)
            ? (body.mistakeTypes as string[]).filter((m) => (MISTAKE_TYPES as readonly string[]).includes(m))
            : []) as PrismaMistakeType[],
        }),
        ...(body.marketOutcome !== undefined && {
          marketOutcome: (MARKET_OUTCOMES as readonly string[]).includes(body.marketOutcome) ? body.marketOutcome : null,
        }),
        ...(body.reviewNote !== undefined && {
          reviewNote: body.reviewNote ? String(body.reviewNote).trim() : null,
        }),
      },
      include: { executions: { orderBy: { executionTime: 'asc' } } },
    });

    // Return setup enriched with day context.
    const dayCtx = await prisma.dayContext.findUnique({ where: { date: row.setupDate } });
    return NextResponse.json(mapSetup(row as unknown as DbSetup, dayCtx ? mapDayContext(dayCtx) : null));
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
