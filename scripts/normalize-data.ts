/**
 * normalize-data.ts
 *
 * Backfills structured fields from legacy string fields in TradeSetup.
 * Safe to run multiple times — only updates NULL target columns.
 *
 * Usage:
 *   pnpm tsx scripts/normalize-data.ts
 *   pnpm tsx scripts/normalize-data.ts --dry-run
 */

import { PrismaClient } from '../lib/generated/prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

// ── Trigger text → TriggerType mapping ────────────────────────────────────────
const TRIGGER_MAP: Record<string, string> = {
  'vwap reclaim':     'VWAP_RECLAIM',
  'reclaim vwap':     'VWAP_RECLAIM',
  'vwap_reclaim':     'VWAP_RECLAIM',
  'vwap reject':      'VWAP_REJECT',
  'reject vwap':      'VWAP_REJECT',
  'vwap_reject':      'VWAP_REJECT',
  'orb break':        'ORB_BREAK',
  'orb_break':        'ORB_BREAK',
  'opening range break': 'ORB_BREAK',
  'sweep fail':       'SWEEP_FAIL',
  'sweep_fail':       'SWEEP_FAIL',
  'failed sweep':     'SWEEP_FAIL',
  'range high reject':'RANGE_HIGH_REJECT',
  'range low reclaim':'RANGE_LOW_RECLAIM',
  'breakout confirm': 'BREAKOUT_CONFIRM',
  'breakout':         'BREAKOUT_CONFIRM',
  'breakdown confirm':'BREAKDOWN_CONFIRM',
  'breakdown':        'BREAKDOWN_CONFIRM',
};

function parseTriggerType(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  return TRIGGER_MAP[normalized] ?? null;
}

function parseFloat_(val: string): number | null {
  const trimmed = val.trim().replace(/[,$]/g, '');
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

// ── SetupType text → SetupType enum ──────────────────────────────────────────
// (legacy RANGE / FLIP already exist; nothing to backfill for setupType)

async function run() {
  console.log(`[normalize-data] Starting${isDryRun ? ' (DRY RUN)' : ''}...`);

  const setups = await prisma.tradeSetup.findMany({
    select: {
      id: true,
      trigger: true,
      riskEntry: true,
      riskStop: true,
      riskTarget: true,
      triggerType: true,
      entryPrice: true,
      stopPrice: true,
      targetPrice: true,
    },
  });

  console.log(`[normalize-data] Processing ${setups.length} setups...`);

  let updatedCount = 0;
  const unmappedTriggers: string[] = [];

  for (const s of setups) {
    const patch: Record<string, unknown> = {};

    // triggerType from trigger text
    if (!s.triggerType && s.trigger) {
      const mapped = parseTriggerType(s.trigger);
      if (mapped) {
        patch.triggerType = mapped;
      } else if (s.trigger.trim()) {
        unmappedTriggers.push(`[${s.id}] "${s.trigger}"`);
      }
    }

    // entryPrice from riskEntry
    if (s.entryPrice === null && s.riskEntry) {
      const parsed = parseFloat_(s.riskEntry);
      if (parsed !== null) patch.entryPrice = parsed;
    }

    // stopPrice from riskStop
    if (s.stopPrice === null && s.riskStop) {
      const parsed = parseFloat_(s.riskStop);
      if (parsed !== null) patch.stopPrice = parsed;
    }

    // targetPrice from riskTarget
    if (s.targetPrice === null && s.riskTarget) {
      const parsed = parseFloat_(s.riskTarget);
      if (parsed !== null) patch.targetPrice = parsed;
    }

    if (Object.keys(patch).length === 0) continue;

    console.log(`  [${s.id}] updating: ${JSON.stringify(patch)}`);
    updatedCount++;

    if (!isDryRun) {
      await prisma.tradeSetup.update({
        where: { id: s.id },
        data: patch as Parameters<typeof prisma.tradeSetup.update>[0]['data'],
      });
    }
  }

  console.log(`\n[normalize-data] Done. ${updatedCount} setups updated.`);

  if (unmappedTriggers.length > 0) {
    console.warn(`\n[normalize-data] Unmapped trigger strings (review manually):`);
    for (const t of unmappedTriggers) {
      console.warn(`  ${t}`);
    }
  }
}

run()
  .catch((err) => {
    console.error('[normalize-data] Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
