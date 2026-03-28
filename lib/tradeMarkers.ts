import { readFile } from 'fs/promises';
import path from 'path';
import type { TradeMarkerFilePayload } from '@/types/tradeMarkers';

const SAFE_SYMBOL = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** YYYYMMDD */
const COMPACT_DATE = /^\d{8}$/;

export type LoadTradeMarkersResult =
  | { ok: true; data: TradeMarkerFilePayload }
  | { ok: false; reason: 'not_found' | 'invalid_json' | 'invalid_args' };

function resolveTradeMarkersPath(symbol: string, tradeDateCompact: string): string | null {
  const sym = symbol.trim();
  const d = tradeDateCompact.trim();
  if (!SAFE_SYMBOL.test(sym) || !COMPACT_DATE.test(d)) return null;
  return path.join(process.cwd(), 'data', 'trades', sym, `${d}-markers.json`);
}

/** `2026-03-27` → `20260327` for IBKR-style filenames. */
export function tradingDateYmdToCompact(ymd: string): string {
  return ymd.replace(/-/g, '');
}

/**
 * Loads `data/trades/{symbol}/{YYYYMMDD}-markers.json` (server-only).
 */
export async function loadTradeMarkers(
  symbol: string,
  tradeDateCompact: string
): Promise<LoadTradeMarkersResult> {
  const filePath = resolveTradeMarkersPath(symbol, tradeDateCompact);
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

  if (typeof parsed !== 'object' || parsed === null || !('markers' in parsed)) {
    return { ok: false, reason: 'invalid_json' };
  }

  return { ok: true, data: parsed as TradeMarkerFilePayload };
}
