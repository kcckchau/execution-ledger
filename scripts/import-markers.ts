/**
 * CLI: import IBKR marker JSON into the database.
 *
 * Usage:
 *   pnpm import:markers <symbol> <YYYY-MM-DD> <path/to/file.json> [--replace]
 *
 * Flags:
 *   --replace   Delete existing ChartMarker records AND the auto-generated
 *               TradeSetup/Executions for this (symbol, date) before importing.
 *               Use this when you re-run convert:csv and need a clean slate.
 *
 * Example:
 *   pnpm import:markers QQQ 2026-03-27 ./data/trades/QQQ/20260327-markers.json
 *   pnpm import:markers QQQ 2026-03-27 ./data/trades/QQQ/20260327-markers.json --replace
 */

import path from 'path';
import { config } from 'dotenv';

// Load .env so DATABASE_URL is available when running outside Next.js
config({ path: path.resolve(process.cwd(), '.env') });

import {
  importIbkrMarkersFile,
  clearIbkrImport,
} from '../lib/import/importIbkrMarkers';

async function main() {
  const args = process.argv.slice(2);
  const replace = args.includes('--replace');
  const positional = args.filter((a) => !a.startsWith('--'));
  const [symbol, tradeDate, filePath] = positional;

  if (!symbol || !tradeDate || !filePath) {
    console.error(
      'Usage: pnpm import:markers <symbol> <YYYY-MM-DD> <path/to/markers.json> [--replace]'
    );
    console.error(
      'Example: pnpm import:markers QQQ 2026-03-27 ./data/trades/QQQ/20260327-markers.json'
    );
    process.exit(1);
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(tradeDate)) {
    console.error(`Invalid date "${tradeDate}" — expected YYYY-MM-DD`);
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  console.log(`Importing markers for ${symbol} on ${tradeDate}`);
  console.log(`File: ${resolvedPath}`);

  if (replace) {
    console.log('--replace: clearing existing records first…');
    await clearIbkrImport(symbol, tradeDate);
    console.log('Cleared.');
  }

  const result = await importIbkrMarkersFile(resolvedPath, symbol, tradeDate);

  console.log(`\nDone.`);
  console.log(`\n── Chart markers ─────────────────────────────────────`);
  console.log(`  Total   : ${result.total}`);
  console.log(`  Inserted: ${result.inserted}`);
  console.log(`  Skipped : ${result.skipped}`);
  console.log(`\n── Execution ledger ───────────────────────────────────`);
  console.log(`  Setups detected: ${result.setupCount}`);
  console.log(`  Setup IDs      : ${result.setupIds.join(', ') || '—'}`);
  console.log(`  Execs inserted: ${result.execInserted}`);
  console.log(`  Execs skipped : ${result.execSkipped}`);
  console.log(`\nImported trades are now visible in the Execution Ledger.`);
}

main().catch((err) => {
  console.error('Import failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
