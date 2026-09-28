import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../lib/prisma';

async function main() {
  const [, , symbol, tradeDate] = process.argv;
  if (!symbol || !tradeDate) {
    console.error('Usage: pnpm tsx scripts/clear-import.ts <SYMBOL> <YYYY-MM-DD>');
    process.exit(1);
  }

  const compactDate = tradeDate.replace(/-/g, '');
  const idPrefix = `ibkr-${symbol.toLowerCase()}-${compactDate}`;

  // Find all setups matching this symbol+date (any account suffix)
  const setups = await prisma.tradeSetup.findMany({
    where: { id: { startsWith: idPrefix } },
    select: { id: true },
  });

  if (setups.length === 0) {
    console.log(`No setups found for ${symbol} on ${tradeDate}`);
    process.exit(0);
  }

  console.log(`Clearing ${symbol} on ${tradeDate}: ${setups.map(s => s.id).join(', ')}`);

  const compactDateStr = tradeDate.replace(/-/g, '');
  await Promise.all([
    prisma.chartMarker.deleteMany({ where: { symbol: symbol.toUpperCase(), tradeDate: compactDateStr } }),
    prisma.tradeSetup.deleteMany({ where: { id: { startsWith: idPrefix } } }),
  ]);

  console.log(`Deleted ${setups.length} setup(s) + chart markers.`);
  process.exit(0);
}

main();
