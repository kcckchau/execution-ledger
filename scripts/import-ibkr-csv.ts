/**
 * CLI: one-shot IBKR CSV import (convert + import).
 *
 * Usage:
 *   pnpm import:csv <path/to/trades.csv> [SYMBOL] [--replace]
 *
 * Examples:
 *   pnpm import:csv ~/Downloads/ibkr.csv QQQ
 *   pnpm import:csv ~/Downloads/ibkr.csv QQQ --replace
 */

import { readFileSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

function parseArgs(argv: string[]) {
  const replace = argv.includes('--replace');
  const positional = argv.filter((a) => !a.startsWith('--'));
  const [csvPathArg, symbolArg] = positional;
  return { csvPathArg, symbolArg, replace };
}

function toIsoDate(yyyyMmDd: string): string {
  return yyyyMmDd;
}

function toCompactDate(yyyyMmDd: string): string {
  return yyyyMmDd.replace(/-/g, '');
}

function parseCsvHeaderAndFirstRow(csvRaw: string): {
  date: string;
  symbol: string;
} {
  const lines = csvRaw.trim().split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV appears empty or missing data rows.');
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  const values = lines[1].split(',').map((v) => v.trim());

  const timeIdx = headers.indexOf('time');
  const symbolIdx = headers.indexOf('symbol');

  if (timeIdx < 0 || symbolIdx < 0) {
    throw new Error('CSV must include "time" and "symbol" columns.');
  }

  const rawTime = values[timeIdx];
  const csvSymbol = values[symbolIdx];
  const date = rawTime.split(' ')[0];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Could not parse trade date from CSV time "${rawTime}".`);
  }
  if (!csvSymbol) {
    throw new Error('Could not parse symbol from CSV.');
  }

  return { date, symbol: csvSymbol };
}

function runOrFail(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const { csvPathArg, symbolArg, replace } = parseArgs(process.argv.slice(2));
  if (!csvPathArg) {
    console.error('Usage: pnpm import:csv <path/to/trades.csv> [SYMBOL] [--replace]');
    process.exit(1);
  }

  const csvPath = path.resolve(process.cwd(), csvPathArg);
  const csvRaw = readFileSync(csvPath, 'utf8');
  const parsed = parseCsvHeaderAndFirstRow(csvRaw);

  const symbol = symbolArg ?? parsed.symbol;
  const tradeDate = toIsoDate(parsed.date);
  const compactDate = toCompactDate(tradeDate);
  const outputPath = path.join(process.cwd(), 'data', 'trades', symbol, `${compactDate}-markers.json`);

  console.log(`Step 1/2: Converting CSV for ${symbol}...`);
  runOrFail('pnpm', ['convert:csv', csvPath, symbol]);

  console.log(`Step 2/2: Importing markers for ${symbol} on ${tradeDate}...`);
  const importArgs = ['import:markers', symbol, tradeDate, outputPath];
  if (replace) {
    importArgs.push('--replace');
  }
  runOrFail('pnpm', importArgs);

  console.log('\nDone: convert + import completed.');
}

main();
