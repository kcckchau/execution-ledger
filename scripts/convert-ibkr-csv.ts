/**
 * CLI: Convert IBKR execution CSV to markers JSON format.
 *
 * Usage:
 *   pnpm convert:csv <path/to/trades.csv> [SYMBOL]
 *
 * Output:
 *   data/trades/{SYMBOL}/{YYYYMMDD}-markers.json
 *
 * Expected CSV columns (IBKR execution report):
 *   time, symbol, secType, exchange, currency, side, shares, price,
 *   avg_price, cum_qty, order_id, perm_id, exec_id, client_id, acct_number, commission
 *
 * The `time` column is ALWAYS treated as America/New_York (Eastern) wall-clock time,
 * regardless of the machine timezone this script runs on.
 *
 * After running this, import into the DB with:
 *   pnpm import:markers <SYMBOL> <YYYY-MM-DD> <output-file>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

type Side = 'BOT' | 'SLD';
type ExecutionType = 'starter' | 'add' | 'trim' | 'exit';

interface CsvRow {
  localTime: string; // "2026-03-30 10:52:49"
  symbol: string;
  side: Side;
  shares: number;
  price: number;
  permId: string;
}

interface MergedFill {
  symbol: string;
  side: Side;
  shares: number;
  price: number; // VWAP across partial fills
  date: Date;
  permId: string;
}

interface MarkerItem {
  time: string;
  minuteTime: string;
  symbol: string;
  side: Side;
  shares: number;
  price: number;
  executionType: ExecutionType;
  positionEffect: 'open' | 'close';
  shape: 'arrowUp' | 'arrowDown';
  color: string;
  text: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS: Record<ExecutionType, string> = {
  starter: '#22c55e',
  add:     '#3b82f6',
  trim:    '#eab308',
  exit:    '#ef4444',
};

const LABEL: Record<ExecutionType, string> = {
  starter: 'S',
  add:     'A',
  trim:    'T',
  exit:    'X',
};

// ── Time helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the UTC offset string for America/New_York on a given date.
 * e.g. "-04:00" (EDT summer) or "-05:00" (EST winter).
 *
 * Uses the difference between UTC noon and New York noon to compute the offset,
 * which is robust across all Node.js versions and does not depend on `shortOffset`.
 */
function easternOffset(dateStr: string): string {
  // Probe at UTC noon — safely within the trading day, away from DST boundaries.
  const probe = new Date(`${dateStr}T12:00:00Z`);

  const nyFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const nyTime = nyFmt.format(probe); // "08:00" for EDT, "07:00" for EST
  const [nyH, nyM] = nyTime.split(':').map(Number);

  // UTC noon = 12:00 → offset = NY hour - 12
  let offsetMins = (nyH * 60 + nyM) - (12 * 60);
  // Guard against midnight-crossing edge cases
  if (offsetMins > 720)  offsetMins -= 1440;
  if (offsetMins < -720) offsetMins += 1440;

  const sign  = offsetMins <= 0 ? '-' : '+';
  const absH  = String(Math.floor(Math.abs(offsetMins) / 60)).padStart(2, '0');
  const absM  = String(Math.abs(offsetMins) % 60).padStart(2, '0');
  return `${sign}${absH}:${absM}`;
}

/**
 * Parse "2026-03-30 10:52:49" as a New York wall-clock time → UTC Date.
 * Always attaches the given offset so the result is timezone-unambiguous,
 * regardless of the machine's local timezone.
 */
function parseEastern(localStr: string, offset: string): Date {
  // Produces a spec-compliant ISO 8601 string: "2026-03-30T10:52:49-04:00"
  return new Date(`${localStr.replace(' ', 'T')}${offset}`);
}

/**
 * Date → "2026-03-30T10:52:49-04:00"
 * Reconstructs the New York wall-clock time from the UTC instant.
 * Never uses toLocaleString() so the result is machine-timezone-independent.
 */
function toIsoOffset(d: Date, offset: string): string {
  const sign = offset[0] === '-' ? -1 : 1;
  const [offH, offM] = offset.slice(1).split(':').map(Number);
  const localMs = d.getTime() + sign * (offH * 60 + offM) * 60_000;
  const ld = new Date(localMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${ld.getUTCFullYear()}-${pad(ld.getUTCMonth() + 1)}-${pad(ld.getUTCDate())}` +
    `T${pad(ld.getUTCHours())}:${pad(ld.getUTCMinutes())}:${pad(ld.getUTCSeconds())}${offset}`
  );
}

/**
 * Date → minute-truncated ISO string with standard colon offset.
 * e.g. "2026-03-30T10:52:00-04:00"
 *
 * The offset always keeps its colon ("-04:00", not "-0400") because the
 * compact form is implementation-defined in ECMAScript and can silently
 * misparse in some environments.
 */
function toMinuteIso(d: Date, offset: string): string {
  const full = toIsoOffset(d, offset);
  return `${full.slice(0, 16)}:00${offset}`; // "2026-03-30T10:52:00-04:00"
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseCsv(raw: string, symbolFilter?: string): CsvRow[] {
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  const col = (cells: string[], name: string) => (cells[headers.indexOf(name)] ?? '').trim();

  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = line.split(',');
    const symbol = col(cells, 'symbol');
    if (symbolFilter && symbol !== symbolFilter) continue;
    const side = col(cells, 'side') as Side;
    if (side !== 'BOT' && side !== 'SLD') continue;
    rows.push({
      localTime: col(cells, 'time'),
      symbol,
      side,
      shares: parseFloat(col(cells, 'shares')),
      price:  parseFloat(col(cells, 'price')),
      permId: col(cells, 'perm_id'),
    });
  }
  return rows;
}

// ── Merge partial fills ───────────────────────────────────────────────────────

/**
 * Fills sharing the same perm_id are partial fills of one order.
 * Merge them: sum shares, VWAP price, keep earliest timestamp.
 */
function mergeByPermId(rows: (CsvRow & { date: Date })[]): MergedFill[] {
  const map = new Map<string, (CsvRow & { date: Date })[]>();
  for (const r of rows) {
    const key = r.permId || `${r.localTime}|${r.side}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  return [...map.values()].map((fills) => {
    const totalShares = fills.reduce((s, f) => s + f.shares, 0);
    const vwap = fills.reduce((s, f) => s + f.price * f.shares, 0) / totalShares;
    const earliest = fills.reduce((a, b) => (a.date < b.date ? a : b));
    return {
      symbol:   earliest.symbol,
      side:     earliest.side,
      shares:   totalShares,
      price:    parseFloat(vwap.toFixed(4)),
      date:     earliest.date,
      permId:   earliest.permId,
    };
  });
}

// ── Position tracking ─────────────────────────────────────────────────────────

/**
 * Assigns executionType by tracking the running net position across fills.
 *
 *  position === 0 before fill → starter (opening)
 *  position grows in same direction → add
 *  position shrinks but stays open → trim
 *  position reaches 0 → exit
 */
function assignExecutionTypes(fills: MergedFill[]): MarkerItem[] {
  let position = 0;

  return fills.map((fill) => {
    const delta = fill.side === 'BOT' ? fill.shares : -fill.shares;
    const prevPos = position;
    position += delta;

    let executionType: ExecutionType;
    if (prevPos === 0) {
      executionType = 'starter';
    } else if (position === 0) {
      executionType = 'exit';
    } else if (Math.abs(position) > Math.abs(prevPos)) {
      executionType = 'add';
    } else {
      executionType = 'trim';
    }

    return {
      time:            '',        // filled below
      minuteTime:      '',
      symbol:          fill.symbol,
      side:            fill.side,
      shares:          fill.shares,
      price:           fill.price,
      executionType,
      positionEffect:  executionType === 'starter' || executionType === 'add' ? 'open' : 'close',
      shape:           fill.side === 'BOT' ? 'arrowUp' : 'arrowDown',
      color:           COLORS[executionType],
      text:            LABEL[executionType],
      _date:           fill.date,  // temp, removed before output
    } as MarkerItem & { _date: Date };
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const [, , csvPath, symbolArg] = process.argv;
  if (!csvPath) {
    console.error('Usage: pnpm convert:csv <path/to/trades.csv> [SYMBOL]');
    process.exit(1);
  }

  const raw = readFileSync(path.resolve(process.cwd(), csvPath), 'utf8');
  const rows = parseCsv(raw, symbolArg);

  if (rows.length === 0) {
    console.error('No rows found. Check symbol filter or CSV columns.');
    process.exit(1);
  }

  const tradeDate = rows[0].localTime.split(' ')[0]; // "2026-03-30"
  const offset    = easternOffset(tradeDate);
  const symbol    = symbolArg ?? rows[0].symbol;

  const timed = rows.map((r) => ({ ...r, date: parseEastern(r.localTime, offset) }));
  const merged = mergeByPermId(timed).sort((a, b) => a.date.getTime() - b.date.getTime());
  const withTypes = assignExecutionTypes(merged) as (MarkerItem & { _date: Date })[];

  const markers: MarkerItem[] = withTypes.map(({ _date, ...m }) => ({
    ...m,
    time:       toIsoOffset(_date, offset),
    minuteTime: toMinuteIso(_date, offset),
  }));

  const compactDate = tradeDate.replace(/-/g, '');
  const output = {
    symbol,
    tradeDate:    compactDate,
    timezone:     'America/New_York',
    rawCount:     rows.length,
    mergedCount:  markers.length,
    markers,
  };

  const outDir  = path.join(process.cwd(), 'data', 'trades', symbol);
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${compactDate}-markers.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  // Summary
  let pos = 0;
  const posCheck = markers.map((m) => {
    const d = m.side === 'BOT' ? m.shares : -m.shares;
    pos += d;
    return `  ${m.time.slice(11, 19)}  ${m.side} ${m.shares.toString().padStart(6)} @ ${m.price.toFixed(4).padStart(10)}  [${m.executionType.padEnd(7)}]  pos=${pos}`;
  });

  console.log(`\nConverted: ${rows.length} raw fills → ${markers.length} merged markers`);
  console.log(`Offset   : ${offset}  (America/New_York on ${tradeDate})`);
  console.log(`Output   : ${outPath}`);
  console.log(`\n── Fill log ─────────────────────────────────────────────────────`);
  posCheck.forEach((l) => console.log(l));
  console.log(`\nFinal position: ${pos}  ${pos !== 0 ? '⚠️  not flat — check data' : '✓ flat'}`);
  console.log(`\nNext step:`);
  console.log(`  pnpm import:markers ${symbol} ${tradeDate} ${outPath}`);
}

main();
