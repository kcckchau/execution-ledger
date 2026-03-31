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
  localTime: string; // "2026-03-30 10:52:49"  (NY wall-clock from CSV)
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
  price: number;    // VWAP across partial fills
  date: Date;       // UTC Date (used only for sort order)
  csvLocalStr: string; // Original NY wall-clock string from earliest fill, e.g. "2026-03-30 10:52:49"
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

/**
 * Marker colors are keyed by execution side:
 *   - BOT  -> darker green than the up-candle
 *   - SLD  -> darker red than the down-candle
 */
const COLORS: Record<Side, string> = {
  BOT: '#15803d', // green-700 — darker than candlestick green
  SLD: '#b91c1c', // red-700  — darker than candlestick red
};

const LABEL: Record<ExecutionType, string> = {
  starter: 'O',
  add:     'A',
  trim:    'T',
  exit:    'C',
};

// ── Time helpers ──────────────────────────────────────────────────────────────

/**
 * Compute the UTC offset for America/New_York on a given date string (YYYY-MM-DD).
 * Uses a pure JS DST calculation — no Intl dependency, works on any machine timezone.
 *
 * US DST rule: EDT (UTC-4) from the 2nd Sunday of March to the 1st Sunday of November.
 */
function easternOffset(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);

  function nthSunday(year: number, month: number, n: number): number {
    const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const firstSun = (7 - firstOfMonth.getUTCDay()) % 7; // days until first Sunday (0 if already Sunday)
    return 1 + firstSun + (n - 1) * 7;
  }

  const dstStart = nthSunday(y, 3, 2);  // 2nd Sunday of March
  const dstEnd   = nthSunday(y, 11, 1); // 1st Sunday of November

  const inEdt =
    (m === 3  && d >= dstStart) ||
    (m > 3    && m < 11)        ||
    (m === 11 && d < dstEnd);

  return inEdt ? '-04:00' : '-05:00';
}

/**
 * Build a UTC Date from a NY wall-clock string and the pre-computed offset.
 * e.g. "2026-03-30 10:52:49" + "-04:00" → Date at 14:52:49 UTC
 *
 * This is only used for sort order. The original string is kept for output.
 */
function parseEastern(csvLocalStr: string, offset: string): Date {
  return new Date(`${csvLocalStr.replace(' ', 'T')}${offset}`);
}

/**
 * Format a marker `time` field from the original CSV local string.
 * "2026-03-30 10:52:49" + "-04:00"  →  "2026-03-30T10:52:49-04:00"
 */
function markerTime(csvLocalStr: string, offset: string): string {
  return `${csvLocalStr.replace(' ', 'T')}${offset}`;
}

/**
 * Format a marker `minuteTime` field (second-truncated) from the original CSV local string.
 * "2026-03-30 10:52:49" + "-04:00"  →  "2026-03-30T10:52:00-04:00"
 */
function markerMinuteTime(csvLocalStr: string, offset: string): string {
  const dt = csvLocalStr.replace(' ', 'T');
  return `${dt.slice(0, 16)}:00${offset}`;
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
 * Merge: sum shares, VWAP price, keep the earliest timestamp and its original local string.
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
      symbol:      earliest.symbol,
      side:        earliest.side,
      shares:      totalShares,
      price:       parseFloat(vwap.toFixed(4)),
      date:        earliest.date,
      csvLocalStr: earliest.localTime, // keep original NY wall-clock string
      permId:      earliest.permId,
    };
  });
}

// ── Position tracking ─────────────────────────────────────────────────────────

function assignExecutionTypes(
  fills: MergedFill[]
): (MarkerItem & { _csvLocalStr: string })[] {
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
      time:            '', // set after
      minuteTime:      '', // set after
      symbol:          fill.symbol,
      side:            fill.side,
      shares:          fill.shares,
      price:           fill.price,
      executionType,
      positionEffect:  executionType === 'starter' || executionType === 'add' ? 'open' : 'close',
      shape:           fill.side === 'BOT' ? 'arrowUp' : 'arrowDown',
      color:           COLORS[fill.side],
      text:            LABEL[executionType],
      _csvLocalStr:    fill.csvLocalStr,
    };
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

  const timed  = rows.map((r) => ({ ...r, date: parseEastern(r.localTime, offset) }));
  const merged = mergeByPermId(timed).sort((a, b) => a.date.getTime() - b.date.getTime());
  const typed  = assignExecutionTypes(merged);

  // Build final markers using the original CSV local string — no UTC roundtrip.
  const markers: MarkerItem[] = typed.map(({ _csvLocalStr, ...m }) => ({
    ...m,
    time:       markerTime(_csvLocalStr, offset),
    minuteTime: markerMinuteTime(_csvLocalStr, offset),
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
  const log = markers.map((m) => {
    pos += m.side === 'BOT' ? m.shares : -m.shares;
    return (
      `  ${m.time.slice(11, 19)}  ${m.side} ${m.shares.toString().padStart(6)}` +
      ` @ ${m.price.toFixed(4).padStart(10)}  [${m.executionType.padEnd(7)}]  pos=${pos}`
    );
  });

  console.log(`\nConverted: ${rows.length} raw fills → ${markers.length} merged markers`);
  console.log(`Offset   : ${offset}  (America/New_York on ${tradeDate})`);
  console.log(`Output   : ${outPath}`);
  console.log(`\n── Fill log ─────────────────────────────────────────────────────`);
  log.forEach((l) => console.log(l));
  console.log(`\nFinal position: ${pos}  ${pos !== 0 ? '⚠️  not flat — check data' : '✓ flat'}`);
  console.log(`\nNext step:`);
  console.log(`  pnpm import:markers ${symbol} ${tradeDate} ${outPath}`);
}

main();
