import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '../lib/generated/prisma/client';
import { calcSetupPnl } from '../lib/pnl';

config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

function fmt(n: number) {
  return n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;
}

function pct(n: number, total: number) {
  return total === 0 ? '0%' : `${((n / total) * 100).toFixed(0)}%`;
}

function avg(arr: number[]) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function bar(value: number, max: number, width = 20) {
  const filled = Math.round((Math.abs(value) / max) * width);
  const char = value >= 0 ? '█' : '░';
  return char.repeat(Math.min(filled, width));
}

async function main() {
  const symbol = process.argv[2] ?? 'QQQ';

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  SETUP ANALYSIS — ${symbol}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Fetch all real (non-ideal) setups for this symbol with executions
  const setups = await prisma.tradeSetup.findMany({
    where: { symbol, isIdeal: false },
    include: { executions: true },
    orderBy: { setupDate: 'asc' },
  });

  console.log(`Total setups found: ${setups.length}\n`);

  if (setups.length === 0) {
    console.log('No setups found. Make sure trades are imported.');
    return;
  }

  // Calculate P&L for each setup
  type SetupWithPnl = (typeof setups)[0] & {
    pnl: number;
    avgEntry: number | null;
    avgExit: number | null;
    numExecs: number;
  };

  const withPnl: SetupWithPnl[] = setups.map((s) => {
    const direction = s.direction === 'long' ? 'long' : 'short';
    const pnlSummary = calcSetupPnl(
      s.executions.map((e) => ({
        id: e.id,
        actionType: e.actionType,
        price: e.price,
        size: e.size,
        executionTime: e.executionTime,
        note: e.note ?? '',
      })),
      direction,
    );
    return {
      ...s,
      pnl: pnlSummary.realizedPnl,
      avgEntry: pnlSummary.avgEntry,
      avgExit: pnlSummary.avgExit,
      numExecs: s.executions.length,
    };
  });

  // Only show setups that have executions (actual trades)
  const traded = withPnl.filter((s) => s.numExecs > 0);
  const noExec = withPnl.filter((s) => s.numExecs === 0);

  console.log(`With executions (traded): ${traded.length}`);
  console.log(`No executions (planned only): ${noExec.length}\n`);

  if (traded.length === 0) {
    console.log('No setups with executions found.');
    return;
  }

  const totalPnl = traded.reduce((sum, s) => sum + s.pnl, 0);
  const wins = traded.filter((s) => s.pnl > 0);
  const losses = traded.filter((s) => s.pnl < 0);
  const bep = traded.filter((s) => s.pnl === 0);
  const winRate = wins.length / traded.length;

  console.log(`${'─'.repeat(70)}`);
  console.log(`  OVERALL SUMMARY`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`  Total P&L   : ${fmt(totalPnl)}`);
  console.log(`  Win Rate    : ${wins.length}W / ${losses.length}L / ${bep.length}BE  (${pct(wins.length, traded.length)} win rate)`);
  console.log(`  Avg Win     : ${fmt(avg(wins.map((s) => s.pnl)))}`);
  console.log(`  Avg Loss    : ${fmt(avg(losses.map((s) => s.pnl)))}`);
  const avgWin = avg(wins.map((s) => s.pnl));
  const avgLoss = Math.abs(avg(losses.map((s) => s.pnl)));
  console.log(`  Win/Loss R  : ${avgLoss === 0 ? 'N/A' : (avgWin / avgLoss).toFixed(2) + ':1'}`);
  console.log(`  Best Trade  : ${fmt(Math.max(...traded.map((s) => s.pnl)))}`);
  console.log(`  Worst Trade : ${fmt(Math.min(...traded.map((s) => s.pnl)))}\n`);

  // ── BY SETUP TYPE ────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(70)}`);
  console.log(`  BY SETUP TYPE`);
  console.log(`${'─'.repeat(70)}`);

  const byType = new Map<string, SetupWithPnl[]>();
  for (const s of traded) {
    const key = s.setupType ?? 'UNCLASSIFIED';
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(s);
  }

  const typeStats = [...byType.entries()]
    .map(([type, setups]) => {
      const pnlTotal = setups.reduce((sum, s) => sum + s.pnl, 0);
      const w = setups.filter((s) => s.pnl > 0).length;
      const l = setups.filter((s) => s.pnl < 0).length;
      return { type, setups, pnlTotal, count: setups.length, w, l };
    })
    .sort((a, b) => b.pnlTotal - a.pnlTotal);

  const maxTypePnl = Math.max(...typeStats.map((t) => Math.abs(t.pnlTotal)), 1);

  for (const t of typeStats) {
    const wr = t.count === 0 ? 0 : t.w / t.count;
    const pnlBar = bar(t.pnlTotal, maxTypePnl);
    console.log(
      `  ${t.type.padEnd(22)} ${fmt(t.pnlTotal).padStart(10)}  ${pnlBar}  ${t.w}W/${t.l}L (${(wr * 100).toFixed(0)}%)  n=${t.count}`,
    );
  }

  // ── BY DIRECTION ─────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  BY DIRECTION`);
  console.log(`${'─'.repeat(70)}`);

  for (const dir of ['long', 'short']) {
    const group = traded.filter((s) => s.direction === dir);
    if (group.length === 0) continue;
    const pnlTotal = group.reduce((sum, s) => sum + s.pnl, 0);
    const w = group.filter((s) => s.pnl > 0).length;
    const l = group.filter((s) => s.pnl < 0).length;
    console.log(
      `  ${dir.toUpperCase().padEnd(8)}  ${fmt(pnlTotal).padStart(10)}  ${w}W/${l}L (${pct(w, group.length)})  n=${group.length}`,
    );
  }

  // ── BY DAY TYPE ──────────────────────────────────────────────────────────
  const hasDayType = traded.some((s) => s.dayType);
  if (hasDayType) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  BY DAY TYPE`);
    console.log(`${'─'.repeat(70)}`);

    const byDay = new Map<string, SetupWithPnl[]>();
    for (const s of traded) {
      const key = s.dayType ?? 'UNKNOWN';
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(s);
    }

    const dayStats = [...byDay.entries()]
      .map(([dayType, setups]) => {
        const pnlTotal = setups.reduce((sum, s) => sum + s.pnl, 0);
        const w = setups.filter((s) => s.pnl > 0).length;
        const l = setups.filter((s) => s.pnl < 0).length;
        return { dayType, pnlTotal, count: setups.length, w, l };
      })
      .sort((a, b) => b.pnlTotal - a.pnlTotal);

    for (const d of dayStats) {
      console.log(
        `  ${d.dayType.padEnd(22)} ${fmt(d.pnlTotal).padStart(10)}  ${d.w}W/${d.l}L (${pct(d.w, d.count)})  n=${d.count}`,
      );
    }
  }

  // ── BY TRADE RESULT ──────────────────────────────────────────────────────
  const hasResult = traded.some((s) => s.tradeResult);
  if (hasResult) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  SETUP VALIDITY BREAKDOWN`);
    console.log(`${'─'.repeat(70)}`);

    const byValidity = new Map<string, SetupWithPnl[]>();
    for (const s of traded) {
      const key = s.setupValidity ?? 'UNREVIEWED';
      if (!byValidity.has(key)) byValidity.set(key, []);
      byValidity.get(key)!.push(s);
    }

    for (const [validity, setups] of [...byValidity.entries()].sort()) {
      const pnlTotal = setups.reduce((sum, s) => sum + s.pnl, 0);
      const w = setups.filter((s) => s.pnl > 0).length;
      const l = setups.filter((s) => s.pnl < 0).length;
      console.log(
        `  ${validity.padEnd(22)} ${fmt(pnlTotal).padStart(10)}  ${w}W/${l}L (${pct(w, setups.length)})  n=${setups.length}`,
      );
    }
  }

  // ── MISTAKE ANALYSIS ─────────────────────────────────────────────────────
  const hasMistakes = traded.some((s) => s.mistakeTypes.length > 0);
  if (hasMistakes) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  MISTAKE FREQUENCY (losses only)`);
    console.log(`${'─'.repeat(70)}`);

    const mistakeCounts = new Map<string, { count: number; totalLoss: number }>();
    for (const s of losses) {
      for (const m of s.mistakeTypes) {
        const key = m as string;
        if (!mistakeCounts.has(key)) mistakeCounts.set(key, { count: 0, totalLoss: 0 });
        const entry = mistakeCounts.get(key)!;
        entry.count++;
        entry.totalLoss += s.pnl;
      }
    }

    const sorted = [...mistakeCounts.entries()].sort((a, b) => b[1].count - a[1].count);
    for (const [mistake, { count, totalLoss }] of sorted) {
      console.log(`  ${mistake.padEnd(28)} ${count}x  avg loss: ${fmt(totalLoss / count)}`);
    }
  }

  // ── TOP 5 BEST SETUPS ────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  TOP 5 BEST SETUPS`);
  console.log(`${'─'.repeat(70)}`);

  const best = [...traded].sort((a, b) => b.pnl - a.pnl).slice(0, 5);
  for (const s of best) {
    const entry = s.avgEntry != null ? `entry $${s.avgEntry.toFixed(2)}` : '';
    const exit = s.avgExit != null ? `→ exit $${s.avgExit.toFixed(2)}` : '';
    console.log(
      `  ${s.setupDate}  ${s.direction.toUpperCase().padEnd(6)}  ${(s.setupType ?? 'N/A').padEnd(22)}  ${fmt(s.pnl).padStart(10)}  ${entry} ${exit}`,
    );
    if (s.setupName) console.log(`    Name: ${s.setupName}`);
    if (s.overallNotes) console.log(`    Notes: ${s.overallNotes.slice(0, 80)}`);
  }

  // ── TOP 5 WORST SETUPS ───────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  TOP 5 WORST SETUPS`);
  console.log(`${'─'.repeat(70)}`);

  const worst = [...traded].sort((a, b) => a.pnl - b.pnl).slice(0, 5);
  for (const s of worst) {
    const entry = s.avgEntry != null ? `entry $${s.avgEntry.toFixed(2)}` : '';
    const exit = s.avgExit != null ? `→ exit $${s.avgExit.toFixed(2)}` : '';
    console.log(
      `  ${s.setupDate}  ${s.direction.toUpperCase().padEnd(6)}  ${(s.setupType ?? 'N/A').padEnd(22)}  ${fmt(s.pnl).padStart(10)}  ${entry} ${exit}`,
    );
    if (s.setupName) console.log(`    Name: ${s.setupName}`);
    if (s.mistakeTypes.length > 0) console.log(`    Mistakes: ${s.mistakeTypes.join(', ')}`);
    if (s.overallNotes) console.log(`    Notes: ${s.overallNotes.slice(0, 80)}`);
  }

  // ── FULL SETUP LIST ──────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  ALL SETUPS (chronological)`);
  console.log(`${'─'.repeat(70)}`);
  console.log(
    `  ${'Date'.padEnd(12)} ${'Dir'.padEnd(6)} ${'Type'.padEnd(22)} ${'P&L'.padStart(10)}  ${'Valid?'.padEnd(14)} Grade`,
  );
  console.log(`  ${'─'.repeat(65)}`);

  for (const s of traded) {
    const validity = s.setupValidity ?? '';
    const grade = s.initialGrade ?? '';
    const result = s.pnl > 0 ? '✓' : s.pnl < 0 ? '✗' : '─';
    console.log(
      `  ${s.setupDate}  ${s.direction.toUpperCase().padEnd(6)} ${(s.setupType ?? 'N/A').padEnd(22)} ${fmt(s.pnl).padStart(10)}  ${result}  ${validity.padEnd(13)} ${grade}`,
    );
  }

  console.log(`\n${'═'.repeat(70)}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
