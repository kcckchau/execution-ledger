/**
 * analyze-market-context.ts
 *
 * For every QQQ setup with executions, loads the matching market data file,
 * computes VWAP from cumulative volume-price, and shows exactly what
 * price/VWAP looked like at each entry and exit.
 *
 * Usage:
 *   npx tsx scripts/analyze-market-context.ts [QQQ] [--top N] [--date YYYY-MM-DD]
 */

import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
import { PrismaClient } from '../lib/generated/prisma/client';
import { calcSetupPnl } from '../lib/pnl';

config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

// ── Types ─────────────────────────────────────────────────────────────────────

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number; // present in older files
};

type MarketFile = {
  symbol: string;
  tradingDate: string;
  timezone: string;
  levels?: Record<string, number | null>;
  sessions: {
    premarket?: { candles: Candle[] };
    regular: { candles: Candle[] };
    aftermarket?: { candles: Candle[] };
  };
};

// ── VWAP calculation ──────────────────────────────────────────────────────────

function computeVwap(candles: Candle[]): Map<string, number> {
  const map = new Map<string, number>();
  let cumVP = 0;
  let cumVol = 0;

  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    cumVP += typical * c.volume;
    cumVol += c.volume;
    map.set(c.time, cumVol > 0 ? cumVP / cumVol : typical);
  }
  return map;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMinuteKey(iso: string | Date): string {
  const d = new Date(typeof iso === 'string' ? iso : iso.toISOString());
  d.setSeconds(0, 0);
  return d.toISOString();
}

function toET(dt: Date): string {
  return dt.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmt(n: number) {
  return n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;
}

function fmtPrice(n: number) {
  return `$${n.toFixed(2)}`;
}

function relVwap(price: number, vwap: number) {
  const diff = price - vwap;
  const pctDiff = (diff / vwap) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(2)} (${sign}${pctDiff.toFixed(2)}% vs VWAP)`;
}

function candleBar(c: Candle, refPrice?: number) {
  const dir = c.close >= c.open ? '▲' : '▼';
  const body = Math.abs(c.close - c.open).toFixed(2);
  const ref = refPrice != null ? ` ← EXEC` : '';
  return `  ${c.time.slice(11, 16)}  O:${fmtPrice(c.open)} H:${fmtPrice(c.high)} L:${fmtPrice(c.low)} C:${fmtPrice(c.close)} ${dir}${body}  vol:${Math.round(c.volume).toLocaleString()}${ref}`;
}

function loadMarket(symbol: string, date: string): MarketFile | null {
  const filePath = path.join(process.cwd(), 'data', 'market', symbol, `${date}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8')) as MarketFile;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const symbol = args.find((a) => !a.startsWith('--')) ?? 'QQQ';
  const topN = (() => {
    const i = args.indexOf('--top');
    return i >= 0 ? parseInt(args[i + 1], 10) : 0; // 0 = all
  })();
  const filterDate = (() => {
    const i = args.indexOf('--date');
    return i >= 0 ? args[i + 1] : undefined;
  })();
  const onlyLosers = args.includes('--losers');
  const onlyWinners = args.includes('--winners');

  const setups = await prisma.tradeSetup.findMany({
    where: {
      symbol,
      isIdeal: false,
      ...(filterDate ? { setupDate: filterDate } : {}),
    },
    include: { executions: { orderBy: { executionTime: 'asc' } } },
    orderBy: { setupDate: 'asc' },
  });

  const traded = setups.filter((s) => s.executions.length > 0);

  // Calculate P&L for each
  type WithPnl = (typeof traded)[0] & { pnl: number };
  const withPnl: WithPnl[] = traded.map((s) => {
    const dir = s.direction === 'long' ? 'long' : 'short';
    const summary = calcSetupPnl(
      s.executions.map((e) => ({
        id: e.id,
        actionType: e.actionType,
        price: e.price,
        size: e.size,
        executionTime: e.executionTime,
        note: e.note ?? '',
      })),
      dir,
    );
    return { ...s, pnl: summary.realizedPnl };
  });

  let filtered = withPnl;
  if (onlyLosers) filtered = filtered.filter((s) => s.pnl < 0);
  if (onlyWinners) filtered = filtered.filter((s) => s.pnl > 0);

  // Sort by absolute P&L if --top requested (show biggest movers)
  if (topN > 0) {
    filtered = [...filtered].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, topN);
    // Re-sort chronologically for readability
    filtered.sort((a, b) => a.setupDate.localeCompare(b.setupDate));
  }

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  MARKET CONTEXT ANALYSIS — ${symbol}  (${filtered.length} setups)`);
  console.log(`${'═'.repeat(72)}`);

  let missingMarket = 0;

  for (const s of filtered) {
    const market = loadMarket(symbol, s.setupDate);
    if (!market) {
      missingMarket++;
      continue;
    }

    const regularCandles = market.sessions.regular.candles;
    if (!regularCandles || regularCandles.length === 0) continue;

    // Build VWAP map (use pre-computed if available, else compute)
    const hasBaked = regularCandles[0]?.vwap != null;
    const vwapMap: Map<string, number> = hasBaked
      ? new Map(regularCandles.map((c) => [c.time, c.vwap!]))
      : computeVwap(regularCandles);

    // Index candles by minute key
    const candleByMinute = new Map<string, Candle>();
    for (const c of regularCandles) {
      candleByMinute.set(toMinuteKey(c.time), c);
    }

    // Group executions into entries (starter/add) and exits (trim/exit)
    const entries = s.executions.filter((e) => e.actionType === 'starter' || e.actionType === 'add');
    const exits = s.executions.filter((e) => e.actionType === 'trim' || e.actionType === 'exit');

    const firstEntry = s.executions[0];
    const lastExit = exits[exits.length - 1] ?? s.executions[s.executions.length - 1];

    const firstEntryMinute = toMinuteKey(firstEntry.executionTime);
    const lastExitMinute = toMinuteKey(lastExit.executionTime);

    const entryCandle = candleByMinute.get(firstEntryMinute);
    const exitCandle = candleByMinute.get(lastExitMinute);

    const entryVwap = entryCandle ? (vwapMap.get(entryCandle.time) ?? null) : null;
    const exitVwap = exitCandle ? (vwapMap.get(exitCandle.time) ?? null) : null;

    const levels = market.levels ?? {};
    const pnlLabel = s.pnl > 0 ? '✓ WIN' : s.pnl < 0 ? '✗ LOSS' : '─ BE';

    // ── Header ───────────────────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(72)}`);
    console.log(
      `  ${s.setupDate}  ${s.direction.toUpperCase()}  ${s.setupType ?? 'N/A'}  ${fmt(s.pnl).padStart(10)}  ${pnlLabel}`,
    );
    if (s.setupName) console.log(`  Name: ${s.setupName}`);
    console.log(`${'─'.repeat(72)}`);

    // ── Key Levels ───────────────────────────────────────────────────────────
    const levelItems: string[] = [];
    if (levels.previous_close) levelItems.push(`PrevClose:${fmtPrice(levels.previous_close)}`);
    if (levels.previous_day_high) levelItems.push(`PDH:${fmtPrice(levels.previous_day_high)}`);
    if (levels.previous_day_low) levelItems.push(`PDL:${fmtPrice(levels.previous_day_low)}`);
    if (levels.premarket_high) levelItems.push(`PMH:${fmtPrice(levels.premarket_high)}`);
    if (levels.premarket_low) levelItems.push(`PML:${fmtPrice(levels.premarket_low)}`);
    if (levels.opening_range_high) levelItems.push(`ORH:${fmtPrice(levels.opening_range_high)}`);
    if (levels.opening_range_low) levelItems.push(`ORL:${fmtPrice(levels.opening_range_low)}`);
    if (levelItems.length > 0) console.log(`  Levels: ${levelItems.join('  ')}`);

    // ── Execution Summary ────────────────────────────────────────────────────
    console.log(`\n  EXECUTIONS`);
    for (const e of s.executions) {
      const eMin = toMinuteKey(e.executionTime);
      const eCandle = candleByMinute.get(eMin);
      const eVwap = eCandle ? (vwapMap.get(eCandle.time) ?? null) : null;
      const timeStr = toET(new Date(e.executionTime));
      const vwapCtx = eVwap != null ? `  VWAP:${fmtPrice(eVwap)} (${relVwap(e.price, eVwap)})` : '';
      console.log(`    ${timeStr}  ${e.actionType.toUpperCase().padEnd(7)} ${e.size}sh @ ${fmtPrice(e.price)}${vwapCtx}`);
    }

    // ── Entry Context ────────────────────────────────────────────────────────
    console.log(`\n  ENTRY CONTEXT (3 candles before → entry candle)`);
    if (entryCandle) {
      const entryIdx = regularCandles.findIndex((c) => c.time === entryCandle.time);
      const contextStart = Math.max(0, entryIdx - 3);
      const contextCandles = regularCandles.slice(contextStart, entryIdx + 1);

      for (const c of contextCandles) {
        const vwap = vwapMap.get(c.time);
        const isEntry = c.time === entryCandle.time;
        const vwapStr = vwap != null ? `  VWAP:${fmtPrice(vwap)}` : '';
        console.log(candleBar(c) + vwapStr + (isEntry ? '  ← ENTRY' : ''));
      }

      if (entryVwap != null) {
        const pos = firstEntry.price > entryVwap ? 'ABOVE' : 'BELOW';
        console.log(
          `\n  Entry price ${fmtPrice(firstEntry.price)} is ${pos} VWAP — ${relVwap(firstEntry.price, entryVwap)}`,
        );
      }
    } else {
      console.log('  (no market data for entry time)');
    }

    // ── Exit Context ─────────────────────────────────────────────────────────
    console.log(`\n  EXIT CONTEXT (exit candle + 3 after)`);
    if (exitCandle) {
      const exitIdx = regularCandles.findIndex((c) => c.time === exitCandle.time);
      const contextEnd = Math.min(regularCandles.length, exitIdx + 4);
      const contextCandles = regularCandles.slice(exitIdx, contextEnd);

      for (const c of contextCandles) {
        const vwap = vwapMap.get(c.time);
        const isExit = c.time === exitCandle.time;
        const vwapStr = vwap != null ? `  VWAP:${fmtPrice(vwap)}` : '';
        console.log(candleBar(c) + vwapStr + (isExit ? '  ← EXIT' : ''));
      }

      if (exitVwap != null) {
        const pos = lastExit.price > exitVwap ? 'ABOVE' : 'BELOW';
        console.log(
          `\n  Exit price ${fmtPrice(lastExit.price)} is ${pos} VWAP — ${relVwap(lastExit.price, exitVwap)}`,
        );
      }
    } else {
      console.log('  (no market data for exit time)');
    }

    // ── Trade Arc: price path from entry to exit ─────────────────────────────
    if (entryCandle && exitCandle) {
      const entryIdx = regularCandles.findIndex((c) => c.time === entryCandle.time);
      const exitIdx = regularCandles.findIndex((c) => c.time === exitCandle.time);

      if (exitIdx > entryIdx) {
        const arcCandles = regularCandles.slice(entryIdx, exitIdx + 1);
        const highs = arcCandles.map((c) => c.high);
        const lows = arcCandles.map((c) => c.low);
        const maxHigh = Math.max(...highs);
        const minLow = Math.min(...lows);
        const durationMin = exitIdx - entryIdx;

        const entryPrice = firstEntry.price;
        const exitPrice = lastExit.price;
        const maxFav =
          s.direction === 'long' ? maxHigh - entryPrice : entryPrice - minLow;
        const maxAdv =
          s.direction === 'long' ? entryPrice - minLow : maxHigh - entryPrice;

        console.log(`\n  TRADE ARC  (${durationMin} min)`);
        console.log(`    Entry:       ${fmtPrice(entryPrice)}`);
        console.log(`    Exit:        ${fmtPrice(exitPrice)}`);
        console.log(`    Move:        ${fmt(exitPrice - entryPrice)} per share`);
        console.log(`    Max favorable excursion: ${fmtPrice(maxFav)} (best price range reached)`);
        console.log(`    Max adverse excursion:   ${fmtPrice(maxAdv)} (worst drawdown reached)`);
      }
    }

    // ── Notes / Mistakes ─────────────────────────────────────────────────────
    if (s.overallNotes) console.log(`\n  Notes: ${s.overallNotes}`);
    if (s.mistakeTypes.length > 0) console.log(`  Mistakes: ${s.mistakeTypes.join(', ')}`);
    if (s.reviewNote) console.log(`  Review: ${s.reviewNote}`);
  }

  if (missingMarket > 0) {
    console.log(`\n  (${missingMarket} setups skipped — no market data file found)`);
  }

  console.log(`\n${'═'.repeat(72)}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
