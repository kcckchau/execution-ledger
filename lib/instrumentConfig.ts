/**
 * Per-symbol contract multiplier (point value).
 * For equities and ETFs the implicit value is 1 — 1 share moves $1 per $1.
 * For futures the multiplier converts index points to dollars per contract.
 *
 * Add new symbols here as needed; anything not listed defaults to 1.
 */
export const POINT_VALUES: Record<string, number> = {
  MNQ: 2,   // Micro E-mini Nasdaq-100: $2 per point per contract
  NQ:  20,  // E-mini Nasdaq-100: $20 per point per contract
  MES: 5,   // Micro E-mini S&P 500: $5 per point per contract
  ES:  50,  // E-mini S&P 500: $50 per point per contract
};

export function getPointValue(symbol: string): number {
  return POINT_VALUES[symbol.toUpperCase()] ?? 1;
}
