/**
 * Deterministic setup detection from intraday session candles.
 * No machine learning — rule-based only.
 *
 * Supported setups:
 *   VWAP_RECLAIM  — long: price crosses back above VWAP after sustained time below
 *   VWAP_REJECT   — short: price crosses back below VWAP after sustained time above
 *   SWEEP_FAIL    — both: price sweeps a key level intrabar but closes back through it
 */

import type { SessionChartData, SessionCandle, SessionLevels } from '@/types/sessionChart';
import type {
  Trigger,
  Confirmation,
  InvalidationType,
  KeyLevel,
  Direction,
  LiquidityContext,
  TradeLocation,
  EntryType,
  Grade,
} from '@/types/setup';

// ── Detection thresholds ───────────────────────────────────────────────────────

/** Number of candles to look back when checking "was below/above VWAP". */
const RECLAIM_LOOKBACK = 5;
/** Minimum number of lookback candles that must be below/above VWAP. */
const BELOW_COUNT_MIN = 3;
/** Minimum price distance from VWAP for a cross to be considered real (not noise). */
const VWAP_CROSS_DISTANCE = 0.02;
/** Minimum wick beyond a key level to qualify as a meaningful sweep (points). */
const SWEEP_WICK_MIN = 0.05;
/** Minimum close distance back through the swept level (points). */
const SWEEP_CLOSE_DISTANCE = 0.05;
/** Minimum candle gap between two signals of the same type to avoid duplicates. */
const DEDUP_MIN_CANDLES = 20;
/** Maximum R:R target multiplier when no key level is available as a target. */
const FALLBACK_RR = 2;

// ── Types ─────────────────────────────────────────────────────────────────────

export type DetectedSetupType = 'VWAP_RECLAIM' | 'VWAP_REJECT' | 'SWEEP_FAIL';

/** Internal working object produced by the detection functions. */
interface SetupCandidate {
  type: DetectedSetupType;
  direction: Direction;
  candleIndex: number;
  candleTime: string;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  vwapAtEntry: number;
  /** For SWEEP_FAIL: the KeyLevel enum value that was swept. */
  sweptLevel?: KeyLevel;
  /** For SWEEP_FAIL: the actual price of the swept level. */
  sweptLevelPrice?: number;
  notesDetail: string;
}

/**
 * SetupDraft — all fields needed to confirm and POST to /api/setups.
 * Uses the raw DB-level SetupType enum values (VWAP_RECLAIM, VWAP_REJECT, SWEEP_FAIL)
 * rather than the frontend SETUP_TYPES display enum.
 */
export interface SetupDraft {
  setupDate: string;
  symbol: string;
  direction: Direction;
  /** DB-level SetupType: 'VWAP_RECLAIM' | 'VWAP_REJECT' | 'SWEEP_FAIL' */
  setupType: string;
  triggers: Trigger[];
  keyLevels: KeyLevel[];
  confirmation: Confirmation[];
  invalidationType: InvalidationType;
  invalidationNote: string | null;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  location: TradeLocation | null;
  liquidityContext: LiquidityContext | null;
  entryType: EntryType;
  isIdeal: true;
  initialGrade: Grade;
  /** Human-readable explanation of why this setup was detected. */
  overallNotes: string;
  /** Planned thesis / objective. */
  decisionTarget: string;
  /** Candle timestamp that triggered the detected setup. Used for review chart markers only. */
  detectedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundPrice(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Returns true when a candle belongs to the regular trading session (09:30–16:00 ET). */
function isRegularCandle(candle: SessionCandle): boolean {
  if (candle.session != null) return candle.session === 'regular';
  // Fallback: parse the time string and check hour/minute.
  // Use UTC offset -0500 (EST) or -0400 (EDT) — both are captured by checking
  // whether the local hour (ET) is between 09:30 and 15:59.
  // Since the time string includes the offset we can extract the hour from the string.
  const timeStr = candle.time; // e.g. "2026-03-03T09:30:00-0500"
  const match = /T(\d{2}):(\d{2})/.exec(timeStr);
  if (!match) return false;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const minutes = h * 60 + m;
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

/**
 * Returns the nearest price level strictly above `above`, drawn from known levels + VWAP.
 * `vwap` is only included when it sits above `above`.
 */
function findNearestResistance(
  above: number,
  levels: SessionLevels,
  vwap: number,
): number | null {
  const candidates: number[] = [
    levels.opening_range_high,
    levels.premarket_high,
    levels.previous_day_high,
    vwap,
  ].filter((l): l is number => typeof l === 'number' && l > above + 0.01);

  return candidates.length > 0 ? Math.min(...candidates) : null;
}

/**
 * Returns the nearest price level strictly below `below`, drawn from known levels + VWAP.
 */
function findNearestSupport(
  below: number,
  levels: SessionLevels,
  vwap: number,
): number | null {
  const candidates: number[] = [
    levels.opening_range_low,
    levels.premarket_low,
    levels.previous_day_low,
    vwap,
  ].filter((l): l is number => typeof l === 'number' && l < below - 0.01);

  return candidates.length > 0 ? Math.max(...candidates) : null;
}

/**
 * Maps a swept price back to the canonical KeyLevel enum value.
 * Returns 'RANGE_HIGH' / 'RANGE_LOW' as fallback for non-matched levels.
 */
function levelToKeyLevel(levelName: string): KeyLevel {
  const map: Record<string, KeyLevel> = {
    premarket_high: 'PREMARKET_HIGH',
    premarket_low: 'PREMARKET_LOW',
    previous_day_high: 'PDH',
    previous_day_low: 'PDL',
    opening_range_high: 'RANGE_HIGH',
    opening_range_low: 'RANGE_LOW',
  };
  return map[levelName] ?? 'RANGE_HIGH';
}

// ── Detection functions ───────────────────────────────────────────────────────

/**
 * Detects VWAP_RECLAIM (long) candidates.
 *
 * Signal: price was below VWAP for at least BELOW_COUNT_MIN of the previous
 * RECLAIM_LOOKBACK candles and then a single candle opens below VWAP and
 * closes above VWAP with a clean bullish body.
 */
function detectVwapReclaim(
  candles: SessionCandle[],
  levels: SessionLevels,
): SetupCandidate[] {
  const results: SetupCandidate[] = [];
  let lastDetectedIndex = -DEDUP_MIN_CANDLES;

  for (let i = RECLAIM_LOOKBACK; i < candles.length; i++) {
    if (i - lastDetectedIndex < DEDUP_MIN_CANDLES) continue;

    const c = candles[i];
    // Must be a bullish cross above VWAP
    if (c.open >= c.vwap) continue;
    if (c.close <= c.vwap) continue;
    if (c.close - c.vwap < VWAP_CROSS_DISTANCE) continue;
    if (c.close <= c.open) continue; // must be a bullish candle

    // Lookback: count how many prior candles closed below VWAP
    const lookback = candles.slice(i - RECLAIM_LOOKBACK, i);
    const belowCount = lookback.filter((lb) => lb.close < lb.vwap).length;
    if (belowCount < BELOW_COUNT_MIN) continue;

    const entry = roundPrice(c.close);
    const stop = roundPrice(Math.min(c.low, c.vwap) - 0.05);
    const risk = entry - stop;
    const resistance = findNearestResistance(entry, levels, c.vwap);
    const target = resistance != null
      ? roundPrice(resistance)
      : roundPrice(entry + risk * FALLBACK_RR);

    const notesDetail =
      `VWAP reclaim at ${c.time.slice(11, 16)} ET — ` +
      `${belowCount}/${RECLAIM_LOOKBACK} lookback candles closed below VWAP (${roundPrice(c.vwap)}). ` +
      `Bullish cross: open ${c.open} → close ${c.close}. ` +
      `Entry ${entry}, stop ${stop} (below candle low), target ${target}` +
      (resistance != null ? ` (nearest resistance)` : ` (${FALLBACK_RR}R fallback)`) + '.';

    results.push({
      type: 'VWAP_RECLAIM',
      direction: 'long',
      candleIndex: i,
      candleTime: c.time,
      entryPrice: entry,
      stopPrice: stop,
      targetPrice: target,
      vwapAtEntry: roundPrice(c.vwap),
      notesDetail,
    });

    lastDetectedIndex = i;
  }

  return results;
}

/**
 * Detects VWAP_REJECT (short) candidates.
 *
 * Signal: price was above VWAP for at least BELOW_COUNT_MIN of the previous
 * RECLAIM_LOOKBACK candles and then a single candle opens above VWAP and
 * closes below VWAP with a clean bearish body.
 */
function detectVwapReject(
  candles: SessionCandle[],
  levels: SessionLevels,
): SetupCandidate[] {
  const results: SetupCandidate[] = [];
  let lastDetectedIndex = -DEDUP_MIN_CANDLES;

  for (let i = RECLAIM_LOOKBACK; i < candles.length; i++) {
    if (i - lastDetectedIndex < DEDUP_MIN_CANDLES) continue;

    const c = candles[i];
    // Must be a bearish cross below VWAP
    if (c.open <= c.vwap) continue;
    if (c.close >= c.vwap) continue;
    if (c.vwap - c.close < VWAP_CROSS_DISTANCE) continue;
    if (c.close >= c.open) continue; // must be a bearish candle

    // Lookback: count how many prior candles closed above VWAP
    const lookback = candles.slice(i - RECLAIM_LOOKBACK, i);
    const aboveCount = lookback.filter((lb) => lb.close > lb.vwap).length;
    if (aboveCount < BELOW_COUNT_MIN) continue;

    const entry = roundPrice(c.close);
    const stop = roundPrice(Math.max(c.high, c.vwap) + 0.05);
    const risk = stop - entry;
    const support = findNearestSupport(entry, levels, c.vwap);
    const target = support != null
      ? roundPrice(support)
      : roundPrice(entry - risk * FALLBACK_RR);

    const notesDetail =
      `VWAP reject at ${c.time.slice(11, 16)} ET — ` +
      `${aboveCount}/${RECLAIM_LOOKBACK} lookback candles closed above VWAP (${roundPrice(c.vwap)}). ` +
      `Bearish cross: open ${c.open} → close ${c.close}. ` +
      `Entry ${entry}, stop ${stop} (above candle high), target ${target}` +
      (support != null ? ` (nearest support)` : ` (${FALLBACK_RR}R fallback)`) + '.';

    results.push({
      type: 'VWAP_REJECT',
      direction: 'short',
      candleIndex: i,
      candleTime: c.time,
      entryPrice: entry,
      stopPrice: stop,
      targetPrice: target,
      vwapAtEntry: roundPrice(c.vwap),
      notesDetail,
    });

    lastDetectedIndex = i;
  }

  return results;
}

/**
 * Detects SWEEP_FAIL candidates (both long and short).
 *
 * High sweep fail (short): candle wicks above a key level (premarket high,
 * opening range high, PDH) by at least SWEEP_WICK_MIN points and closes back
 * below that level by at least SWEEP_CLOSE_DISTANCE points.
 *
 * Low sweep fail (long): mirror image — wick below a key level, close back above.
 */
function detectSweepFails(
  candles: SessionCandle[],
  levels: SessionLevels,
): SetupCandidate[] {
  const results: SetupCandidate[] = [];

  const highLevels: Array<[keyof SessionLevels, string]> = [
    ['premarket_high', 'premarket_high'],
    ['opening_range_high', 'opening_range_high'],
    ['previous_day_high', 'previous_day_high'],
  ];

  const lowLevels: Array<[keyof SessionLevels, string]> = [
    ['premarket_low', 'premarket_low'],
    ['opening_range_low', 'opening_range_low'],
    ['previous_day_low', 'previous_day_low'],
  ];

  // Track detected levels to avoid multiple signals on the same level.
  const detectedHighLevels = new Set<string>();
  const detectedLowLevels = new Set<string>();

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];

    // ── High sweep fail (short) ────────────────────────────────────────────────
    for (const [key, name] of highLevels) {
      if (detectedHighLevels.has(name)) continue;
      const levelPrice = levels[key];
      if (typeof levelPrice !== 'number') continue;

      const wickAbove = c.high - levelPrice;
      const closeBelow = levelPrice - c.close;

      if (wickAbove >= SWEEP_WICK_MIN && closeBelow >= SWEEP_CLOSE_DISTANCE) {
        detectedHighLevels.add(name);

        const entry = roundPrice(c.close);
        const stop = roundPrice(c.high + 0.10);
        const risk = stop - entry;
        const support = findNearestSupport(entry, levels, c.vwap);
        const target = support != null
          ? roundPrice(support)
          : roundPrice(entry - risk * FALLBACK_RR);

        const notesDetail =
          `Sweep fail (short) at ${c.time.slice(11, 16)} ET — ` +
          `wick swept ${name.replace(/_/g, ' ')} (${levelPrice}) by ${roundPrice(wickAbove)} pts ` +
          `but closed ${roundPrice(closeBelow)} pts below it. ` +
          `Entry ${entry}, stop above sweep high ${stop}, target ${target}` +
          (support != null ? ` (nearest support)` : ` (${FALLBACK_RR}R fallback)`) + '.';

        results.push({
          type: 'SWEEP_FAIL',
          direction: 'short',
          candleIndex: i,
          candleTime: c.time,
          entryPrice: entry,
          stopPrice: stop,
          targetPrice: target,
          vwapAtEntry: roundPrice(c.vwap),
          sweptLevel: levelToKeyLevel(name),
          sweptLevelPrice: levelPrice,
          notesDetail,
        });
      }
    }

    // ── Low sweep fail (long) ─────────────────────────────────────────────────
    for (const [key, name] of lowLevels) {
      if (detectedLowLevels.has(name)) continue;
      const levelPrice = levels[key];
      if (typeof levelPrice !== 'number') continue;

      const wickBelow = levelPrice - c.low;
      const closeAbove = c.close - levelPrice;

      if (wickBelow >= SWEEP_WICK_MIN && closeAbove >= SWEEP_CLOSE_DISTANCE) {
        detectedLowLevels.add(name);

        const entry = roundPrice(c.close);
        const stop = roundPrice(c.low - 0.10);
        const risk = entry - stop;
        const resistance = findNearestResistance(entry, levels, c.vwap);
        const target = resistance != null
          ? roundPrice(resistance)
          : roundPrice(entry + risk * FALLBACK_RR);

        const notesDetail =
          `Sweep fail (long) at ${c.time.slice(11, 16)} ET — ` +
          `wick swept ${name.replace(/_/g, ' ')} (${levelPrice}) by ${roundPrice(wickBelow)} pts ` +
          `but closed ${roundPrice(closeAbove)} pts above it. ` +
          `Entry ${entry}, stop below sweep low ${stop}, target ${target}` +
          (resistance != null ? ` (nearest resistance)` : ` (${FALLBACK_RR}R fallback)`) + '.';

        results.push({
          type: 'SWEEP_FAIL',
          direction: 'long',
          candleIndex: i,
          candleTime: c.time,
          entryPrice: entry,
          stopPrice: stop,
          targetPrice: target,
          vwapAtEntry: roundPrice(c.vwap),
          sweptLevel: levelToKeyLevel(name),
          sweptLevelPrice: levelPrice,
          notesDetail,
        });
      }
    }
  }

  return results;
}

// ── Mapping ───────────────────────────────────────────────────────────────────

/**
 * Maps a raw SetupCandidate into a fully-populated SetupDraft.
 * All structured fields are inferred from the candidate type and direction.
 * isIdeal is always true; initialGrade is always "A".
 */
export function mapCandidateToSetupDraft(
  candidate: SetupCandidate,
  date: string,
  symbol: string,
): SetupDraft {
  const { type, direction } = candidate;

  let triggers: Trigger[];
  let confirmation: Confirmation[];
  let invalidationType: InvalidationType;
  let keyLevels: KeyLevel[];
  let location: TradeLocation | null;
  let liquidityContext: LiquidityContext | null;
  let decisionTarget: string;
  let invalidationNote: string | null = null;

  if (type === 'VWAP_RECLAIM') {
    triggers = ['RECLAIM_LEVEL'];
    confirmation = ['HOLD_ABOVE_LEVEL', 'FOLLOW_THROUGH'];
    invalidationType = 'HOLD_BELOW_VWAP';
    keyLevels = ['VWAP'];
    location = 'AT_VWAP';
    liquidityContext = 'NONE';
    decisionTarget =
      'VWAP reclaim — price crossed above VWAP after sustained time below. ' +
      'Look for acceptance and continuation higher. ' +
      `VWAP at entry: ${candidate.vwapAtEntry}.`;
    invalidationNote = 'Trade invalid if price closes back below VWAP.';
  } else if (type === 'VWAP_REJECT') {
    triggers = ['FAILURE_CONFIRM'];
    confirmation = ['HOLD_BELOW_LEVEL', 'FOLLOW_THROUGH'];
    invalidationType = 'RECLAIM_VWAP';
    keyLevels = ['VWAP'];
    location = 'AT_VWAP';
    liquidityContext = 'NONE';
    decisionTarget =
      'VWAP reject — price failed to hold above VWAP and crossed back below. ' +
      'Look for acceptance of lower prices and continuation down. ' +
      `VWAP at entry: ${candidate.vwapAtEntry}.`;
    invalidationNote = 'Trade invalid if price reclaims and holds above VWAP.';
  } else {
    // SWEEP_FAIL
    const sweptKeyLevel = candidate.sweptLevel ?? 'RANGE_HIGH';
    keyLevels = [sweptKeyLevel, 'VWAP'];

    if (direction === 'short') {
      triggers = ['LIQUIDITY_SWEEP', 'FAILURE_CONFIRM'];
      confirmation = ['HOLD_BELOW_LEVEL', 'FOLLOW_THROUGH'];
      invalidationType = 'BREAK_RANGE_HIGH';
      location = 'ABOVE_VWAP';
      liquidityContext = 'SWEEP_HIGH';
      decisionTarget =
        `Sweep and fail (short) — price swept ${sweptKeyLevel.replace(/_/g, ' ')} ` +
        (candidate.sweptLevelPrice != null ? `(${candidate.sweptLevelPrice}) ` : '') +
        'but rejected and closed back below. Look for continuation lower.';
      invalidationNote = `Trade invalid if price reclaims and holds above ${sweptKeyLevel.replace(/_/g, ' ')}.`;
    } else {
      triggers = ['LIQUIDITY_SWEEP', 'FAILURE_CONFIRM'];
      confirmation = ['HOLD_ABOVE_LEVEL', 'FOLLOW_THROUGH'];
      invalidationType = 'BREAK_RANGE_LOW';
      location = 'BELOW_VWAP';
      liquidityContext = 'SWEEP_LOW';
      decisionTarget =
        `Sweep and fail (long) — price swept ${sweptKeyLevel.replace(/_/g, ' ')} ` +
        (candidate.sweptLevelPrice != null ? `(${candidate.sweptLevelPrice}) ` : '') +
        'but reversed and closed back above. Look for continuation higher.';
      invalidationNote = `Trade invalid if price breaks back below ${sweptKeyLevel.replace(/_/g, ' ')}.`;
    }
  }

  return {
    setupDate: date,
    symbol,
    direction,
    setupType: type,
    triggers,
    keyLevels,
    confirmation,
    invalidationType,
    invalidationNote,
    entryPrice: candidate.entryPrice,
    stopPrice: candidate.stopPrice,
    targetPrice: candidate.targetPrice,
    location,
    liquidityContext,
    entryType: 'AGGRESSIVE',
    isIdeal: true,
    initialGrade: 'A',
    overallNotes: candidate.notesDetail,
    decisionTarget,
    detectedAt: candidate.candleTime,
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Runs all detection passes over the session's regular-session candles and
 * returns an array of SetupDraft objects ready for user review.
 * Nothing is written to the database.
 */
export function detectSetupsFromSession(
  session: SessionChartData,
  date: string,
  symbol: string,
): SetupDraft[] {
  const regularCandles = session.candles.filter(isRegularCandle);

  if (regularCandles.length < RECLAIM_LOOKBACK + 1) {
    return [];
  }

  const levels = session.levels;

  const candidates: SetupCandidate[] = [
    ...detectVwapReclaim(regularCandles, levels),
    ...detectVwapReject(regularCandles, levels),
    ...detectSweepFails(regularCandles, levels),
  ];

  // Sort by candle index so the output is chronological
  candidates.sort((a, b) => a.candleIndex - b.candleIndex);

  return candidates.map((c) => mapCandidateToSetupDraft(c, date, symbol));
}
