/**
 * Exponential moving average aligned to `values` (same length).
 * Seeds with SMA of the first `period` values at index `period - 1`, then applies EMA.
 * Indices before the seed bar (`period - 1`) are `null`.
 */
export function computeEma(values: number[], period: number): (number | null)[] {
  const n = values.length;
  const out: (number | null)[] = Array.from({ length: n }, () => null);
  if (n === 0 || period < 1 || n < period) return out;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let ema = sum / period;
  out[period - 1] = ema;

  for (let i = period; i < n; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = ema;
  }

  return out;
}
