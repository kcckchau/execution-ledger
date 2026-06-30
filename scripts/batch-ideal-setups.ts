/**
 * batch-ideal-setups.ts
 *
 * Runs VWAP_RECLAIM, VWAP_REJECT, and SWEEP_FAIL detection across every
 * available market data file for the given symbol and date range, then
 * simulates what would have happened (target hit / stop hit / open) by
 * replaying the remaining candles of the day.
 *
 * Usage:
 *   npx tsx scripts/batch-ideal-setups.ts [QQQ] [--from YYYY-MM-DD] [--mnq]
 *   npx tsx scripts/batch-ideal-setups.ts QQQ --from 2026-05-01
 *   npx tsx scripts/batch-ideal-setups.ts MNQ --from 2026-06-01
 */

import path from 'path';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
import { normalizeMarketSessionFile } from '../lib/normalizeMarketSession';
import { detectSetupsFromSession } from '../lib/detectSetups';
import type { SetupDraft } from '../lib/detectSetups';

config({ path: path.resolve(process.cwd(), '.env') });

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;
}

function fmtPrice(n: number) {
  return `$${n.toFixed(2)}`;
}

type Outcome = 'WIN' | 'LOSS' | 'OPEN';

interface SimResult {
  outcome: Outcome;
  pnlPerShare: number;
  /** How many minutes after entry the outcome was resolved */
  resolvedInMin: number | null;
  /** Actual exit price */
  exitPrice: number | null;
}

/**
 * Simulates the trade by walking forward through candles after the setup's
 * entry candle, checking whether the high/low hits target or stop first.
 * For long: high >= target → WIN, low <= stop → LOSS.
 * For short: low <= target → WIN, high >= stop → LOSS.
 */
function simulate(
  setup: SetupDraft,
  allRegularCandles: Array<{ time: string; high: number; low: number; close: number }>,
): SimResult {
  const entryTime = setup.detectedAt;
  const entryIdx = allRegularCandles.findIndex((c) => c.time === entryTime);
  if (entryIdx < 0 || entryIdx >= allRegularCandles.length - 1) {
    return { outcome: 'OPEN', pnlPerShare: 0, resolvedInMin: null, exitPrice: null };
  }

  const isLong = setup.direction === 'long';
  const { entryPrice, stopPrice, targetPrice } = setup;

  for (let i = entryIdx + 1; i < allRegularCandles.length; i++) {
    const c = allRegularCandles[i];
    const elapsedMin = i - entryIdx;

    if (isLong) {
      // Check target first (optimistic), then stop
      if (c.high >= targetPrice) {
        return {
          outcome: 'WIN',
          pnlPerShare: targetPrice - entryPrice,
          resolvedInMin: elapsedMin,
          exitPrice: targetPrice,
        };
      }
      if (c.low <= stopPrice) {
        return {
          outcome: 'LOSS',
          pnlPerShare: stopPrice - entryPrice,
          resolvedInMin: elapsedMin,
          exitPrice: stopPrice,
        };
      }
    } else {
      // Short
      if (c.low <= targetPrice) {
        return {
          outcome: 'WIN',
          pnlPerShare: entryPrice - targetPrice,
          resolvedInMin: elapsedMin,
          exitPrice: targetPrice,
        };
      }
      if (c.high >= stopPrice) {
        return {
          outcome: 'LOSS',
          pnlPerShare: entryPrice - stopPrice,
          resolvedInMin: elapsedMin,
          exitPrice: stopPrice,
        };
      }
    }
  }

  // End of day — close out at last candle's close
  const lastClose = allRegularCandles[allRegularCandles.length - 1].close;
  const pnlPerShare = isLong ? lastClose - entryPrice : entryPrice - lastClose;
  return {
    outcome: 'OPEN',
    pnlPerShare,
    resolvedInMin: null,
    exitPrice: lastClose,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const symbol = args.find((a) => !a.startsWith('--')) ?? 'QQQ';
  const fromDate = (() => {
    const i = args.indexOf('--from');
    return i >= 0 ? args[i + 1] : '2026-05-01';
  })();

  const marketDir = path.join(process.cwd(), 'data', 'market', symbol);
  if (!existsSync(marketDir)) {
    console.error(`No market data directory: ${marketDir}`);
    process.exit(1);
  }

  const allFiles = readdirSync(marketDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .filter((d) => d >= fromDate)
    .sort();

  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  IDEAL SETUP DETECTION — ${symbol}  (from ${fromDate}, ${allFiles.length} days)`);
  console.log(`${'═'.repeat(78)}`);

  type DayResult = {
    date: string;
    setups: Array<SetupDraft & { sim: SimResult }>;
  };

  const allDays: DayResult[] = [];

  for (const date of allFiles) {
    const filePath = path.join(marketDir, `${date}.json`);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }

    const session = normalizeMarketSessionFile(raw as Parameters<typeof normalizeMarketSessionFile>[0]);
    const drafts = detectSetupsFromSession(session, date, symbol);
    if (drafts.length === 0) continue;

    const regularCandles = session.candles.filter((c) => {
      const match = /T(\d{2}):(\d{2})/.exec(c.time);
      if (!match) return false;
      const mins = parseInt(match[1]) * 60 + parseInt(match[2]);
      return mins >= 9 * 60 + 30 && mins < 16 * 60;
    });

    const daySetups = drafts.map((d) => ({
      ...d,
      sim: simulate(d, regularCandles),
    }));

    allDays.push({ date, setups: daySetups });
  }

  // ── Per-day output ────────────────────────────────────────────────────────

  for (const day of allDays) {
    const levels = (() => {
      const filePath = path.join(marketDir, `${day.date}.json`);
      const raw = JSON.parse(readFileSync(filePath, 'utf8'));
      const session = normalizeMarketSessionFile(raw);
      return session.levels;
    })();

    console.log(`\n${'─'.repeat(78)}`);
    console.log(`  ${day.date}   ${symbol}`);
    const levelParts: string[] = [];
    if (levels.previous_day_high) levelParts.push(`PDH:${fmtPrice(levels.previous_day_high)}`);
    if (levels.previous_day_low) levelParts.push(`PDL:${fmtPrice(levels.previous_day_low)}`);
    if (levels.premarket_high) levelParts.push(`PMH:${fmtPrice(levels.premarket_high)}`);
    if (levels.premarket_low) levelParts.push(`PML:${fmtPrice(levels.premarket_low)}`);
    if (levels.opening_range_high) levelParts.push(`ORH:${fmtPrice(levels.opening_range_high)}`);
    if (levels.opening_range_low) levelParts.push(`ORL:${fmtPrice(levels.opening_range_low)}`);
    if (levelParts.length) console.log(`  ${levelParts.join('  ')}`);
    console.log(`${'─'.repeat(78)}`);

    for (const s of day.setups) {
      const time = s.detectedAt.slice(11, 16);
      const outcome = s.sim.outcome;
      const icon = outcome === 'WIN' ? '✓' : outcome === 'LOSS' ? '✗' : '─';
      const rr = ((s.targetPrice - s.entryPrice) / Math.abs(s.entryPrice - s.stopPrice)).toFixed(2);
      const resolvedStr = s.sim.resolvedInMin != null ? `${s.sim.resolvedInMin}min` : 'EOD';

      console.log(
        `  ${time} ET  ${s.direction.toUpperCase().padEnd(6)} ${s.setupType.padEnd(14)}` +
        `  entry:${fmtPrice(s.entryPrice)}  stop:${fmtPrice(s.stopPrice)}  tgt:${fmtPrice(s.targetPrice)}` +
        `  RR:${rr}  ${icon} ${outcome.padEnd(5)} ${fmt(s.sim.pnlPerShare)}/sh  [${resolvedStr}]`,
      );
      console.log(`    ${s.overallNotes.slice(0, 110)}`);
    }
  }

  // ── Aggregate stats ───────────────────────────────────────────────────────

  const allSetups = allDays.flatMap((d) => d.setups);
  const wins = allSetups.filter((s) => s.sim.outcome === 'WIN');
  const losses = allSetups.filter((s) => s.sim.outcome === 'LOSS');
  const open = allSetups.filter((s) => s.sim.outcome === 'OPEN');

  const avgWinPnl = wins.length > 0
    ? wins.reduce((sum, s) => sum + s.sim.pnlPerShare, 0) / wins.length
    : 0;
  const avgLossPnl = losses.length > 0
    ? losses.reduce((sum, s) => sum + s.sim.pnlPerShare, 0) / losses.length
    : 0;

  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  AGGREGATE — ${symbol} from ${fromDate}`);
  console.log(`${'═'.repeat(78)}`);
  console.log(`  Total setups detected : ${allSetups.length} across ${allDays.length} days`);
  console.log(`  Win / Loss / Open     : ${wins.length} / ${losses.length} / ${open.length}`);
  const denominator = wins.length + losses.length;
  console.log(`  Win rate (resolved)   : ${denominator === 0 ? 'N/A' : ((wins.length / denominator) * 100).toFixed(0) + '%'}`);
  console.log(`  Avg win  per share    : ${fmt(avgWinPnl)}`);
  console.log(`  Avg loss per share    : ${fmt(avgLossPnl)}`);

  // By setup type
  const byType = new Map<string, typeof allSetups>();
  for (const s of allSetups) {
    const k = `${s.setupType}:${s.direction}`;
    if (!byType.has(k)) byType.set(k, []);
    byType.get(k)!.push(s);
  }

  console.log(`\n  BY SETUP TYPE`);
  for (const [key, setups] of [...byType.entries()].sort()) {
    const w = setups.filter((s) => s.sim.outcome === 'WIN').length;
    const l = setups.filter((s) => s.sim.outcome === 'LOSS').length;
    const o = setups.filter((s) => s.sim.outcome === 'OPEN').length;
    const wr = w + l === 0 ? 0 : (w / (w + l)) * 100;
    console.log(`  ${key.padEnd(26)} ${w}W/${l}L/${o}open  WR:${wr.toFixed(0)}%  n=${setups.length}`);
  }

  // By hour of day
  console.log(`\n  BY TIME OF DAY (ET)`);
  const byHour = new Map<number, typeof allSetups>();
  for (const s of allSetups) {
    const hour = parseInt(s.detectedAt.slice(11, 13));
    if (!byHour.has(hour)) byHour.set(hour, []);
    byHour.get(hour)!.push(s);
  }
  for (const [hour, setups] of [...byHour.entries()].sort((a, b) => a[0] - b[0])) {
    const w = setups.filter((s) => s.sim.outcome === 'WIN').length;
    const l = setups.filter((s) => s.sim.outcome === 'LOSS').length;
    const wr = w + l === 0 ? 0 : (w / (w + l)) * 100;
    console.log(`  ${hour}:00–${hour}:59                     ${w}W/${l}L  WR:${wr.toFixed(0)}%  n=${setups.length}`);
  }

  // Best 10 setups by sim pnl
  console.log(`\n  TOP 10 BEST SETUPS (by sim P&L per share)`);
  const best10 = [...allSetups]
    .filter((s) => s.sim.outcome !== 'OPEN')
    .sort((a, b) => b.sim.pnlPerShare - a.sim.pnlPerShare)
    .slice(0, 10);
  for (const s of best10) {
    const time = s.detectedAt.slice(11, 16);
    console.log(
      `  ${s.setupDate}  ${time} ET  ${s.direction.toUpperCase().padEnd(6)} ${s.setupType.padEnd(14)}` +
      `  entry:${fmtPrice(s.entryPrice)} → exit:${fmtPrice(s.sim.exitPrice ?? 0)}  ${fmt(s.sim.pnlPerShare)}/sh  ✓ WIN`,
    );
  }

  // Worst 5 setups
  console.log(`\n  TOP 5 WORST SETUPS (false signals)`);
  const worst5 = [...allSetups]
    .filter((s) => s.sim.outcome === 'LOSS')
    .sort((a, b) => a.sim.pnlPerShare - b.sim.pnlPerShare)
    .slice(0, 5);
  for (const s of worst5) {
    const time = s.detectedAt.slice(11, 16);
    console.log(
      `  ${s.setupDate}  ${time} ET  ${s.direction.toUpperCase().padEnd(6)} ${s.setupType.padEnd(14)}` +
      `  entry:${fmtPrice(s.entryPrice)} → stop:${fmtPrice(s.sim.exitPrice ?? 0)}  ${fmt(s.sim.pnlPerShare)}/sh  ✗ LOSS`,
    );
    console.log(`    ${s.overallNotes.slice(0, 110)}`);
  }

  console.log(`\n${'═'.repeat(78)}\n`);
}

main();
