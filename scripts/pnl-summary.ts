import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../lib/prisma';
import { calcSetupPnl } from '../lib/pnl';
import { getPointValue } from '../lib/instrumentConfig';
import type { Execution as SetupExecution } from '../types/setup';

async function main() {
  const [, , startDate, endDate] = process.argv;
  const start = startDate ?? '2026-08-01';
  const end = endDate ?? '2026-09-30';

  const setups = await prisma.tradeSetup.findMany({
    where: {
      setupDate: { gte: start, lte: end },
      id: { startsWith: 'ibkr-' },
    },
    include: { executions: true },
    orderBy: [{ setupDate: 'asc' }, { symbol: 'asc' }],
  });

  if (setups.length === 0) {
    console.log(`No setups found between ${start} and ${end}`);
    process.exit(0);
  }

  // Group by day
  const byDay = new Map<string, typeof setups>();
  for (const s of setups) {
    if (!byDay.has(s.setupDate)) byDay.set(s.setupDate, []);
    byDay.get(s.setupDate)!.push(s);
  }

  let augTotal = 0, sepTotal = 0;

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  P&L Summary  Aug–Sep 2026');
  console.log('══════════════════════════════════════════════════════');

  let currentMonth = '';
  let monthTotal = 0;

  for (const [day, daySetups] of [...byDay.entries()].sort()) {
    const month = day.slice(0, 7);
    if (month !== currentMonth) {
      if (currentMonth) {
        const sign = monthTotal >= 0 ? '+' : '';
        console.log(`  ${'─'.repeat(50)}`);
        console.log(`  ${currentMonth} total: ${sign}$${monthTotal.toFixed(2)}\n`);
      }
      currentMonth = month;
      monthTotal = 0;
      console.log(`  ${month}`);
      console.log('  ' + '─'.repeat(50));
    }

    let dayPnl = 0;
    const symbolPnls: string[] = [];

    for (const setup of daySetups) {
      const execs = setup.executions as unknown as SetupExecution[];
      const pointValue = getPointValue(setup.symbol);
      const { netPnl, commission } = calcSetupPnl(execs, setup.direction as 'long' | 'short', pointValue);
      dayPnl += netPnl;
      if (netPnl !== 0 || commission > 0) {
        const sign = netPnl >= 0 ? '+' : '';
        const commStr = commission > 0 ? ` (comm $${commission.toFixed(2)})` : '';
        symbolPnls.push(`${setup.symbol} ${sign}$${netPnl.toFixed(2)}${commStr}`);
      }
    }

    monthTotal += dayPnl;
    if (month.startsWith('2026-08')) augTotal += dayPnl;
    if (month.startsWith('2026-09')) sepTotal += dayPnl;

    const dow = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const pnlStr = dayPnl >= 0 ? `+$${dayPnl.toFixed(2)}` : `-$${Math.abs(dayPnl).toFixed(2)}`;
    const detail = symbolPnls.length > 0 ? `   ${symbolPnls.join(', ')}` : '';
    console.log(`  ${day} ${dow}  ${pnlStr.padStart(12)}${detail}`);
  }

  if (currentMonth) {
    const sign = monthTotal >= 0 ? '+' : '';
    console.log(`  ${'─'.repeat(50)}`);
    console.log(`  ${currentMonth} total: ${sign}$${monthTotal.toFixed(2)}\n`);
  }

  console.log('══════════════════════════════════════════════════════');
  if (augTotal !== 0 || start <= '2026-08-31') {
    const sign = augTotal >= 0 ? '+' : '';
    console.log(`  August total   : ${sign}$${augTotal.toFixed(2)}`);
  }
  if (sepTotal !== 0 || end >= '2026-09-01') {
    const sign = sepTotal >= 0 ? '+' : '';
    console.log(`  September total: ${sign}$${sepTotal.toFixed(2)}`);
  }
  const combined = augTotal + sepTotal;
  const sign = combined >= 0 ? '+' : '';
  console.log(`  Combined total : ${sign}$${combined.toFixed(2)}`);
  console.log('══════════════════════════════════════════════════════\n');

  process.exit(0);
}

main();
