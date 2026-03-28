import type { Direction } from '@/types/setup';

/** Parses a loose numeric string (strips commas). */
function parsePrice(s: string): number | null {
  const n = parseFloat(s.trim().replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Planned reward:risk from numeric entry / stop / target strings.
 * Returns null if any value is non-numeric or risk is zero.
 */
export function formatPlannedRiskReward(
  entryStr: string,
  stopStr: string,
  targetStr: string,
  direction: Direction
): string | null {
  const entry = parsePrice(entryStr);
  const stop = parsePrice(stopStr);
  const target = parsePrice(targetStr);
  if (entry === null || stop === null || target === null) return null;

  if (direction === 'long') {
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
  }

  const risk = Math.abs(stop - entry);
  const reward = Math.abs(entry - target);
  if (risk === 0) return null;
  return (reward / risk).toFixed(2);
}
