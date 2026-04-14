import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapSetup, mapDayContext, type DbSetup } from '@/lib/mappers';
import { deriveDeprecatedSetupFields } from '@/lib/setupPayload';
import {
  INVALIDATION_TYPES,
  MISTAKE_TYPES,
  MARKET_OUTCOMES,
  REVIEW_INTENTS,
  TRIGGERS,
  DAY_TYPES,
  TRADE_LOCATIONS,
  LIQUIDITY_CONTEXTS,
  KEY_LEVELS,
  ENTRY_TYPES,
  ENTRY_TIMINGS,
  CONFIRMATIONS,
  TRADE_RESULTS,
  SETUP_VALIDITIES,
} from '@/types/setup';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.tradeSetup.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Setup not found' }, { status: 404 });
    }

    const triggers = Array.isArray(body.triggers)
      ? (body.triggers as string[]).filter((value) => (TRIGGERS as readonly string[]).includes(value))
      : ((existing.triggers as string[]) ?? []);
    const dayType =
      body.dayType !== undefined
        ? ((DAY_TYPES as readonly string[]).includes(body.dayType) ? body.dayType : null)
        : existing.dayType;
    const location =
      body.location !== undefined
        ? ((TRADE_LOCATIONS as readonly string[]).includes(body.location) ? body.location : null)
        : existing.location;
    const keyLevels = Array.isArray(body.keyLevels)
      ? (body.keyLevels as string[]).filter((value) => (KEY_LEVELS as readonly string[]).includes(value))
      : ((existing.keyLevels as string[]) ?? []);
    const tradeResult =
      body.tradeResult !== undefined
        ? ((TRADE_RESULTS as readonly string[]).includes(body.tradeResult) ? body.tradeResult : null)
        : (existing.tradeResult ?? existing.outcome);
    const setupValidity =
      body.setupValidity !== undefined
        ? ((SETUP_VALIDITIES as readonly string[]).includes(body.setupValidity) ? body.setupValidity : null)
        : (existing.setupValidity ?? existing.setupResult);
    const deprecated = deriveDeprecatedSetupFields({
      triggers,
      dayType,
      location,
      keyLevels,
      tradeResult,
      setupValidity,
    });
    const shouldUpdateLegacyContexts =
      body.triggers !== undefined || body.dayType !== undefined || body.location !== undefined;
    const shouldUpdateLegacyLocations = body.keyLevels !== undefined;
    const shouldUpdateLegacyReview =
      body.tradeResult !== undefined || body.setupValidity !== undefined;

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
        ...(body.triggers !== undefined && { triggers }),
        ...(body.dayType !== undefined && { dayType }),
        ...(body.location !== undefined && { location }),
        ...(body.liquidityContext !== undefined && {
          liquidityContext: (LIQUIDITY_CONTEXTS as readonly string[]).includes(body.liquidityContext)
            ? body.liquidityContext
            : null,
        }),
        ...(body.keyLevels !== undefined && { keyLevels }),
        ...(body.entryType !== undefined && {
          entryType: (ENTRY_TYPES as readonly string[]).includes(body.entryType) ? body.entryType : null,
        }),
        ...(body.entryTiming !== undefined && {
          entryTiming: (ENTRY_TIMINGS as readonly string[]).includes(body.entryTiming) ? body.entryTiming : null,
        }),
        ...(body.confirmation !== undefined && {
          confirmation: Array.isArray(body.confirmation)
            ? (body.confirmation as string[]).filter((value) => (CONFIRMATIONS as readonly string[]).includes(value))
            : [],
        }),
        ...(body.triggers !== undefined && { trigger: deprecated.trigger }),
        ...(body.decisionTarget !== undefined && { decisionTarget: String(body.decisionTarget).trim() }),
        ...(body.entryPrice !== undefined && { entryPrice: body.entryPrice || null }),
        ...(body.stopPrice !== undefined && { stopPrice: body.stopPrice || null }),
        ...(body.targetPrice !== undefined && { targetPrice: body.targetPrice || null }),
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
        ...(shouldUpdateLegacyContexts && {
          contexts: deprecated.contexts,
        }),
        ...(shouldUpdateLegacyLocations && { locations: deprecated.locations }),
        ...(body.entryTrigger !== undefined && { entryTrigger: deprecated.entryTrigger }),
        // Layer 2 — market reality
        ...(body.trueRegime !== undefined && { trueRegime: body.trueRegime || null }),
        ...(body.vwapState !== undefined && { vwapState: body.vwapState || null }),
        ...(body.structure !== undefined && { structure: body.structure || null }),
        ...(body.alignment !== undefined && { alignment: body.alignment || null }),
        // Review layer
        ...(body.intent !== undefined && {
          intent: (REVIEW_INTENTS as readonly string[]).includes(body.intent) ? body.intent : null,
        }),
        ...(body.tradeResult !== undefined && { tradeResult }),
        ...(body.setupValidity !== undefined && { setupValidity }),
        ...(shouldUpdateLegacyReview && { outcome: deprecated.outcome }),
        ...(shouldUpdateLegacyReview && { setupResult: deprecated.setupResult }),
        ...(body.mistakeTypes !== undefined && {
          mistakeTypes: Array.isArray(body.mistakeTypes)
            ? (body.mistakeTypes as string[]).filter((m) => (MISTAKE_TYPES as readonly string[]).includes(m))
            : [],
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
