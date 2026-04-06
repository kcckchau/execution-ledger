import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapSetup, mapDayContext } from '@/lib/mappers';
import { SETUP_TYPES, CONTEXTS, LOCATIONS, ENTRY_TRIGGERS } from '@/types/setup';

export async function GET() {
  try {
    const rows = await prisma.tradeSetup.findMany({
      include: { executions: { orderBy: { executionTime: 'asc' } } },
      orderBy: [{ setupDate: 'desc' }, { createdAt: 'asc' }],
    });

    // Fetch day contexts for all unique dates in a single query.
    const dates = [...new Set(rows.map((r) => r.setupDate))];
    const dayContextRows = dates.length > 0
      ? await prisma.dayContext.findMany({ where: { date: { in: dates } } })
      : [];
    const dayContextMap = new Map(dayContextRows.map((d) => [d.date, mapDayContext(d)]));

    return NextResponse.json(rows.map((r) => mapSetup(r, dayContextMap.get(r.setupDate) ?? null)));
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
  // Core required fields
  if (!body.setupType || !(SETUP_TYPES as readonly string[]).includes(body.setupType as string)) {
    return 'setupType is required and must be a valid SetupType';
  }
  if (!body.invalidation || !(body.invalidation as string).trim()) {
    return 'invalidation is required and cannot be empty';
  }
  if (!body.entryTrigger || !(ENTRY_TRIGGERS as readonly string[]).includes(body.entryTrigger as string)) {
    return 'entryTrigger is required and must be a valid EntryTrigger';
  }

  // contexts must be an array of ≥1 valid Context values
  const contexts = body.contexts;
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return 'contexts must be a non-empty array';
  }
  const invalidCtx = (contexts as unknown[]).find(
    (c) => typeof c !== 'string' || !(CONTEXTS as readonly string[]).includes(c)
  );
  if (invalidCtx !== undefined) {
    return `Invalid context value: ${String(invalidCtx)}`;
  }

  // locations must be an array of valid Location values (optional, but if provided must be valid)
  const locations = body.locations;
  if (locations !== undefined && locations !== null) {
    if (!Array.isArray(locations)) {
      return 'locations must be an array';
    }
    const invalidLoc = (locations as unknown[]).find(
      (l) => typeof l !== 'string' || !(LOCATIONS as readonly string[]).includes(l)
    );
    if (invalidLoc !== undefined) {
      return `Invalid location value: ${String(invalidLoc)}`;
    }
  }

  // Cross-field rule: RANGE_REJECT cannot occur at MID_RANGE
  if (
    body.setupType === 'RANGE_REJECT' &&
    Array.isArray(contexts) &&
    (contexts as string[]).includes('RANGE')
  ) {
    const locs = Array.isArray(locations) ? (locations as string[]) : [];
    if (locs.includes('MID_RANGE')) {
      return 'Invalid trade: RANGE_REJECT cannot occur at MID_RANGE — rejections happen at range extremes';
    }
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

    const row = await prisma.tradeSetup.create({
      data: {
        id: body.id,
        setupDate: body.setupDate,
        symbol: body.symbol,
        direction: body.direction,
        setupType: body.setupType,
        trigger: body.trigger ?? '',
        invalidation: body.invalidation,
        decisionTarget: body.decisionTarget ?? '',
        riskEntry: body.riskEntry ?? '',
        riskStop: body.riskStop ?? '',
        riskTarget: body.riskTarget ?? '',
        // 4-part classification
        contexts: body.contexts,
        locations: body.locations ?? [],
        entryTrigger: body.entryTrigger,
        initialGrade: body.initialGrade ?? null,
        status: body.status ?? 'open',
        overallNotes: body.overallNotes ?? '',
        setupName: body.setupName ?? null,
        review: body.review ?? undefined,
      },
      include: { executions: true },
    });

    // Fetch the day context for this setup's date.
    const dayCtx = await prisma.dayContext.findUnique({ where: { date: row.setupDate } });
    return NextResponse.json(
      mapSetup(row, dayCtx ? mapDayContext(dayCtx) : null),
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
