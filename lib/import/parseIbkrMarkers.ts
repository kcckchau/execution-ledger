import { readFile } from 'fs/promises';
import type { TradeMarkerFilePayload, TradeMarkerItem } from '@/types/tradeMarkers';

function isMarkerItem(v: unknown): v is TradeMarkerItem {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.time === 'string' &&
    typeof m.symbol === 'string' &&
    typeof m.side === 'string' &&
    typeof m.shares === 'number' &&
    typeof m.price === 'number' &&
    typeof m.executionType === 'string' &&
    typeof m.positionEffect === 'string' &&
    typeof m.shape === 'string' &&
    typeof m.color === 'string' &&
    typeof m.text === 'string'
  );
}

/**
 * Reads and validates an IBKR marker JSON file.
 * Throws with a descriptive message if the file is missing or malformed.
 */
export async function parseIbkrMarkersFile(
  filePath: string
): Promise<TradeMarkerFilePayload> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read file "${filePath}": ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in "${filePath}"`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Expected a JSON object in "${filePath}"`);
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.symbol !== 'string' || !obj.symbol) {
    throw new Error(`Missing or invalid "symbol" in "${filePath}"`);
  }
  if (typeof obj.tradeDate !== 'string' || !obj.tradeDate) {
    throw new Error(`Missing or invalid "tradeDate" in "${filePath}"`);
  }
  if (!Array.isArray(obj.markers)) {
    throw new Error(`Missing or invalid "markers" array in "${filePath}"`);
  }

  const invalidIdx = (obj.markers as unknown[]).findIndex((m) => !isMarkerItem(m));
  if (invalidIdx !== -1) {
    throw new Error(
      `markers[${invalidIdx}] in "${filePath}" is missing required fields`
    );
  }

  return {
    symbol: obj.symbol,
    tradeDate: obj.tradeDate,
    timezone: typeof obj.timezone === 'string' ? obj.timezone : 'America/New_York',
    rawCount: typeof obj.rawCount === 'number' ? obj.rawCount : obj.markers.length,
    mergedCount:
      typeof obj.mergedCount === 'number' ? obj.mergedCount : obj.markers.length,
    markers: obj.markers as TradeMarkerItem[],
  };
}
