import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapSetup, mapDayContext, type DbSetup } from '@/lib/mappers';
import { deriveDeprecatedSetupFields } from '@/lib/setupPayload';
import {
  SETUP_TYPES,
  TRIGGERS,
  DAY_TYPES,
  TRADE_LOCATIONS,
  LIQUIDITY_CONTEXTS,
  KEY_LEVELS,
  ENTRY_TYPES,
  ENTRY_TIMINGS,
  CONFIRMATIONS,
  REVIEW_INTENTS,
  MARKET_OUTCOMES,
  TRADE_RESULTS,
  SETUP_VALIDITIES,
} from '@/types/setup';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limitParam = parseInt(searchParams.get('limit') ?? '500', 10);
    const limit = isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 500;

    const rows = await prisma.tradeSetup.findMany({
      take: limit,
      include: { executions: { orderBy: { executionTime: 'asc' } } },
      orderBy: [{ setupDate: 'desc' }, { createdAt: 'asc' }],
    });

    // Fetch day contexts for all unique dates in a single query.
    const dates = [...new Set(rows.map((r) => r.setupDate))];
    const dayContextRows = dates.length > 0
      ? await prisma.dayContext.findMany({ where: { date: { in: dates } } })
      : [];
    const dayContextMap = new Map(dayContextRows.map((d) => [d.date, mapDayContext(d)]));

    return NextResponse.json(rows.map((r) => mapSetup(r as unknown as DbSetup, dayContextMap.get(r.setupDate) ?? null)));
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

// ── Validation helpers ────────────────────────────────────────────────────────

function validateSetupBody(body: Record<string, unknown>): string | null {
  if (!body.setupType || !(SETUP_TYPES as readonly string[]).includes(body.setupType as string)) {
    return 'setupType is required and must be a valid SetupType';
  }
  if (!Array.isArray(body.triggers) || body.triggers.length === 0) {
    return 'triggers must be a non-empty array';
  }
  const invalidTrigger = (body.triggers as unknown[]).find(
    (trigger) => typeof trigger !== 'string' || !(TRIGGERS as readonly string[]).includes(trigger),
  );
  if (invalidTrigger !== undefined) {
    return `Invalid trigger value: ${String(invalidTrigger)}`;
  }

  const invalidKeyLevel = Array.isArray(body.keyLevels)
    ? body.keyLevels.find(
        (level: unknown) => typeof level !== 'string' || !(KEY_LEVELS as readonly string[]).includes(level),
      )
    : undefined;
  if (invalidKeyLevel !== undefined) {
    return `Invalid key level value: ${String(invalidKeyLevel)}`;
  }

  const invalidConfirmation = Array.isArray(body.confirmation)
    ? body.confirmation.find(
        (value: unknown) => typeof value !== 'string' || !(CONFIRMATIONS as readonly string[]).includes(value),
      )
    : undefined;
  if (invalidConfirmation !== undefined) {
    return `Invalid confirmation value: ${String(invalidConfirmation)}`;
  }

  if (body.dayType != null && !(DAY_TYPES as readonly string[]).includes(body.dayType as string)) {
    return 'dayType must be a valid DayType';
  }
  if (
    body.location != null &&
    !(TRADE_LOCATIONS as readonly string[]).includes(body.location as string)
  ) {
    return 'location must be a valid TradeLocation';
  }
  if (
    body.liquidityContext != null &&
    !(LIQUIDITY_CONTEXTS as readonly string[]).includes(body.liquidityContext as string)
  ) {
    return 'liquidityContext must be a valid LiquidityContext';
  }
  if (
    body.entryType != null &&
    !(ENTRY_TYPES as readonly string[]).includes(body.entryType as string)
  ) {
    return 'entryType must be a valid EntryType';
  }
  if (
    body.entryTiming != null &&
    !(ENTRY_TIMINGS as readonly string[]).includes(body.entryTiming as string)
  ) {
    return 'entryTiming must be a valid EntryTiming';
  }
  if (
    body.intent != null &&
    !(REVIEW_INTENTS as readonly string[]).includes(body.intent as string)
  ) {
    return 'intent must be a valid ReviewIntent';
  }
  if (
    body.marketOutcome != null &&
    !(MARKET_OUTCOMES as readonly string[]).includes(body.marketOutcome as string)
  ) {
    return 'marketOutcome must be a valid MarketOutcome';
  }
  if (
    body.tradeResult != null &&
    !(TRADE_RESULTS as readonly string[]).includes(body.tradeResult as string)
  ) {
    return 'tradeResult must be a valid TradeResult';
  }
  if (
    body.setupValidity != null &&
    !(SETUP_VALIDITIES as readonly string[]).includes(body.setupValidity as string)
  ) {
    return 'setupValidity must be a valid SetupValidity';
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validationError = validateSetupBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const tradeResult = body.tradeResult ?? null;
    const setupValidity = body.setupValidity ?? null;
    const deprecated = deriveDeprecatedSetupFields({
      triggers: body.triggers ?? [],
      dayType: body.dayType ?? null,
      location: body.location ?? null,
      keyLevels: body.keyLevels ?? [],
      tradeResult,
      setupValidity,
    });

    const row = await prisma.tradeSetup.create({
      data: {
        id: body.id,
        setupDate: body.setupDate,
        symbol: body.symbol,
        direction: body.direction,
        setupType: body.setupType,
        triggers: body.triggers ?? [],
        dayType: body.dayType ?? null,
        location: body.location ?? null,
        liquidityContext: body.liquidityContext ?? null,
        keyLevels: body.keyLevels ?? [],
        entryType: body.entryType ?? null,
        entryTiming: body.entryTiming ?? null,
        confirmation: body.confirmation ?? [],
        trigger: deprecated.trigger,
        decisionTarget: body.decisionTarget ?? '',
        invalidationType: body.invalidationType ?? 'STRUCTURE_BREAK',
        invalidationNote: body.invalidationNote ? String(body.invalidationNote).trim() : null,
        riskEntry: body.riskEntry ?? '',
        riskStop: body.riskStop ?? '',
        riskTarget: body.riskTarget ?? '',
        entryPrice: typeof body.entryPrice === 'number' ? body.entryPrice : null,
        stopPrice: typeof body.stopPrice === 'number' ? body.stopPrice : null,
        targetPrice: typeof body.targetPrice === 'number' ? body.targetPrice : null,
        // Deprecated compatibility fields are derived from canonical fields in one place.
        contexts: deprecated.contexts,
        locations: deprecated.locations,
        entryTrigger: deprecated.entryTrigger,
        isIdeal: body.isIdeal === true,
        initialGrade: body.initialGrade ?? null,
        status: body.status ?? 'open',
        overallNotes: body.overallNotes ?? '',
        setupName: body.setupName ?? null,
        // Review layer (all optional)
        intent: body.intent ?? null,
        tradeResult,
        setupValidity,
        outcome: deprecated.outcome,
        setupResult: deprecated.setupResult,
        mistakeTypes: body.mistakeTypes ?? [],
        marketOutcome: body.marketOutcome ?? null,
        reviewNote: body.reviewNote ? String(body.reviewNote).trim() : null,
      },
      include: { executions: true },
    });

    // Fetch the day context for this setup's date.
    const dayCtx = await prisma.dayContext.findUnique({ where: { date: row.setupDate } });
    return NextResponse.json(
      mapSetup(row as unknown as DbSetup, dayCtx ? mapDayContext(dayCtx) : null),
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
