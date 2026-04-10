import { readFile } from 'fs/promises';
import path from 'path';
import { normalizeMarketSessionFile, type MarketSessionFileJson } from '@/lib/normalizeMarketSession';
import type { SessionChartData } from '@/types/sessionChart';

/** YYYY-MM-DD */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Ticker-like segment: no slashes, safe for a single path segment */
const SAFE_SYMBOL = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type LoadMarketSessionResult =
  | { ok: true; data: SessionChartData }
  | { ok: false; reason: 'not_found' | 'invalid_json' | 'invalid_args' };

// Module-level cache for findPrevTradingDate. Key: "SYMBOL:YYYY-MM-DD".
// The previous trading date for a given day is stable — once determined it never changes.
const prevDateCache = new Map<string, string | null>();

function resolveMarketSessionPath(symbol: string, date: string): string | null {
  const sym = symbol.trim();
  const d = date.trim();
  if (!SAFE_SYMBOL.test(sym) || !ISO_DATE.test(d)) return null;
  return path.join(process.cwd(), 'data', 'market', sym, `${d}.json`);
}

/**
 * Returns the previous trading day ISO date by walking back up to 7 calendar
 * days from `date` and returning the first file that exists on disk.
 * Returns null if no file is found within that window.
 * Results are cached indefinitely — the previous trading day for a given date is immutable.
 */
export async function findPrevTradingDate(
  symbol: string,
  date: string
): Promise<string | null> {
  const cacheKey = `${symbol}:${date}`;
  if (prevDateCache.has(cacheKey)) {
    return prevDateCache.get(cacheKey) ?? null;
  }

  const base = new Date(`${date}T12:00:00Z`);
  let result: string | null = null;
  for (let i = 1; i <= 7; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const filePath = resolveMarketSessionPath(symbol, iso);
    if (!filePath) continue;
    try {
      await readFile(filePath, 'utf8');
      result = iso;
      break;
    } catch {
      // not found — keep looking
    }
  }

  prevDateCache.set(cacheKey, result);
  return result;
}

/**
 * Loads intraday session JSON from `data/market/{symbol}/{date}.json` (relative to project root).
 * Server-only: uses the filesystem. Call from Server Components, Route Handlers, or server actions.
 */
export async function loadMarketSession(
  symbol: string,
  date: string
): Promise<LoadMarketSessionResult> {
  const filePath = resolveMarketSessionPath(symbol, date);
  if (!filePath) {
    return { ok: false, reason: 'invalid_args' };
  }

  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR') {
      return { ok: false, reason: 'not_found' };
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'invalid_json' };
  }

  const data = normalizeMarketSessionFile(parsed as MarketSessionFileJson);
  return { ok: true, data };
}
