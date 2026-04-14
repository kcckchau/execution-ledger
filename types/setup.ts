// ── Legacy string-based market context (kept for backward compat) ─────────────
export const MARKET_CONTEXTS = ['uptrend', 'downtrend', 'range'] as const;
export type MarketContext = (typeof MARKET_CONTEXTS)[number];

export const MARKET_CONTEXT_LABELS: Record<MarketContext, string> = {
  uptrend:   'Uptrend',
  downtrend: 'Downtrend',
  range:     'Range',
};

// ── Setup type ────────────────────────────────────────────────────────────────
export const SETUP_TYPES = [
  'TREND_PULLBACK',
  'BREAKOUT',
  'BREAKDOWN',
  'RANGE',
  'FAILED_MOVE',
  'VWAP_PLAY',
] as const;

export type SetupType = (typeof SETUP_TYPES)[number];

export const SETUP_TYPE_LABELS: Record<SetupType, string> = {
  TREND_PULLBACK: 'Trend Pullback',
  BREAKOUT: 'Breakout',
  BREAKDOWN: 'Breakdown',
  RANGE: 'Range',
  FAILED_MOVE: 'Failed Move',
  VWAP_PLAY: 'VWAP Play',
};

// ── Regime ────────────────────────────────────────────────────────────────────
export const REGIMES = ['UP', 'DOWN', 'RANGE', 'CHOP', 'TRANSITION'] as const;
export type Regime = (typeof REGIMES)[number];

export const REGIME_LABELS: Record<Regime, string> = {
  UP:         'Up',
  DOWN:       'Down',
  RANGE:      'Range',
  CHOP:       'Chop',
  TRANSITION: 'Transition',
};

// ── Transition ────────────────────────────────────────────────────────────────
export const TRANSITIONS = ['NONE', 'FLIP', 'FAILED_FLIP'] as const;
export type Transition = (typeof TRANSITIONS)[number];

export const TRANSITION_LABELS: Record<Transition, string> = {
  NONE:        'None',
  FLIP:        'Flip',
  FAILED_FLIP: 'Failed Flip',
};

// ── Alignment ─────────────────────────────────────────────────────────────────
/** Trade-relative alignment. Lives on TradeSetup, not DayContext. */
export const ALIGNMENTS = [
  'WITH_TREND', // legacy value
  'WITH',       // canonical new value
  'COUNTER',
  'NEUTRAL',
] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

export const ALIGNMENT_LABELS: Record<Alignment, string> = {
  WITH_TREND: 'With Trend',
  WITH:       'With',
  COUNTER:    'Counter',
  NEUTRAL:    'Neutral',
};

// ── Day type ──────────────────────────────────────────────────────────────────
export const DAY_TYPES = [
  'TREND',
  'RANGE',
  'TRANSITION',
] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  TREND: 'Trend',
  RANGE: 'Range',
  TRANSITION: 'Transition',
};

export const TRIGGERS = [
  'RECLAIM_LEVEL',
  'BREAK_AND_HOLD',
  'STRONG_ENGULF',
  'MOMENTUM_SHIFT',
  'LIQUIDITY_SWEEP',
  'FAILURE_CONFIRM',
] as const;
export type Trigger = (typeof TRIGGERS)[number];
export const TRIGGER_LABELS: Record<Trigger, string> = {
  RECLAIM_LEVEL: 'Reclaim Level',
  BREAK_AND_HOLD: 'Break & Hold',
  STRONG_ENGULF: 'Strong Engulf',
  MOMENTUM_SHIFT: 'Momentum Shift',
  LIQUIDITY_SWEEP: 'Liquidity Sweep',
  FAILURE_CONFIRM: 'Failure Confirm',
};

export const TRADE_LOCATIONS = ['ABOVE_VWAP', 'BELOW_VWAP', 'AT_VWAP'] as const;
export type TradeLocation = (typeof TRADE_LOCATIONS)[number];
export const TRADE_LOCATION_LABELS: Record<TradeLocation, string> = {
  ABOVE_VWAP: 'Above VWAP',
  BELOW_VWAP: 'Below VWAP',
  AT_VWAP: 'At VWAP',
};

export const LIQUIDITY_CONTEXTS = ['SWEEP_HIGH', 'SWEEP_LOW', 'NONE'] as const;
export type LiquidityContext = (typeof LIQUIDITY_CONTEXTS)[number];
export const LIQUIDITY_CONTEXT_LABELS: Record<LiquidityContext, string> = {
  SWEEP_HIGH: 'Sweep High',
  SWEEP_LOW: 'Sweep Low',
  NONE: 'None',
};

export const KEY_LEVELS = [
  'PDH',
  'PDL',
  'PREMARKET_HIGH',
  'PREMARKET_LOW',
  'RANGE_HIGH',
  'RANGE_LOW',
  'VWAP',
  'WHOLE_NUMBER',
] as const;
export type KeyLevel = (typeof KEY_LEVELS)[number];
export const KEY_LEVEL_LABELS: Record<KeyLevel, string> = {
  PDH: 'PDH',
  PDL: 'PDL',
  PREMARKET_HIGH: 'Premarket High',
  PREMARKET_LOW: 'Premarket Low',
  RANGE_HIGH: 'Range High',
  RANGE_LOW: 'Range Low',
  VWAP: 'VWAP',
  WHOLE_NUMBER: 'Whole Number',
};

export const ENTRY_TYPES = ['AGGRESSIVE', 'PULLBACK'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];
export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  AGGRESSIVE: 'Aggressive',
  PULLBACK: 'Pullback',
};

export const ENTRY_TIMINGS = ['EARLY', 'IDEAL', 'LATE'] as const;
export type EntryTiming = (typeof ENTRY_TIMINGS)[number];
export const ENTRY_TIMING_LABELS: Record<EntryTiming, string> = {
  EARLY: 'Early',
  IDEAL: 'Ideal',
  LATE: 'Late',
};

export const CONFIRMATIONS = [
  'HOLD_ABOVE_LEVEL',
  'HOLD_BELOW_LEVEL',
  'FOLLOW_THROUGH',
] as const;
export type Confirmation = (typeof CONFIRMATIONS)[number];
export const CONFIRMATION_LABELS: Record<Confirmation, string> = {
  HOLD_ABOVE_LEVEL: 'Hold Above Level',
  HOLD_BELOW_LEVEL: 'Hold Below Level',
  FOLLOW_THROUGH: 'Follow Through',
};

// ── VWAP state ────────────────────────────────────────────────────────────────
export const VWAP_STATES = [
  'ABOVE_ACCEPT',
  'BELOW_ACCEPT',
  'REJECTING_FROM_ABOVE',
  'REJECTING_FROM_BELOW',
  'CHOP_AROUND',
] as const;
export type VWAPState = (typeof VWAP_STATES)[number];

export const VWAP_STATE_LABELS: Record<VWAPState, string> = {
  ABOVE_ACCEPT:          'Above / Accept',
  BELOW_ACCEPT:          'Below / Accept',
  REJECTING_FROM_ABOVE:  'Reject From Above',
  REJECTING_FROM_BELOW:  'Reject From Below',
  CHOP_AROUND:           'Chop Around',
};

// ── Structure type ────────────────────────────────────────────────────────────
export const STRUCTURE_TYPES = [
  'HH_HL',
  'LH_LL',
  'RANGE',
  'BREAKOUT_FAIL',
  'BREAKDOWN_FAIL',
  'REVERSAL',
] as const;
export type StructureType = (typeof STRUCTURE_TYPES)[number];

export const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  HH_HL:         'HH/HL',
  LH_LL:         'LH/LL',
  RANGE:         'Range',
  BREAKOUT_FAIL: 'Breakout Fail',
  BREAKDOWN_FAIL:'Breakdown Fail',
  REVERSAL:      'Reversal',
};

// ── Trigger type ──────────────────────────────────────────────────────────────
export const TRIGGER_TYPES = [
  'VWAP_RECLAIM',
  'VWAP_REJECT',
  'ORB_BREAK',
  'SWEEP_FAIL',
  'RANGE_HIGH_REJECT',
  'RANGE_LOW_RECLAIM',
  'BREAKOUT_CONFIRM',
  'BREAKDOWN_CONFIRM',
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  VWAP_RECLAIM:      'VWAP Reclaim',
  VWAP_REJECT:       'VWAP Reject',
  ORB_BREAK:         'ORB Break',
  SWEEP_FAIL:        'Sweep Fail',
  RANGE_HIGH_REJECT: 'Range High Reject',
  RANGE_LOW_RECLAIM: 'Range Low Reclaim',
  BREAKOUT_CONFIRM:  'Breakout Confirm',
  BREAKDOWN_CONFIRM: 'Breakdown Confirm',
};

// ── Mistake tag ───────────────────────────────────────────────────────────────
export const MISTAKE_TAGS = [
  'EARLY_ENTRY',
  'LATE_ENTRY',
  'CHASE',
  'COUNTER_TREND',
  'NO_CONFIRMATION',
  'OVERTRADE',
  'WRONG_LEVEL',
  'IGNORED_VWAP',
  'IGNORED_STRUCTURE',
  'BAD_STOP',
  'BAD_TARGET',
  'SIZE_TOO_BIG',
  'EMOTIONAL_TRADE',
  'SHOULD_HAVE_SKIPPED',
] as const;
export type MistakeTag = (typeof MISTAKE_TAGS)[number];

export const MISTAKE_TAG_LABELS: Record<MistakeTag, string> = {
  EARLY_ENTRY:         'Early Entry',
  LATE_ENTRY:          'Late Entry',
  CHASE:               'Chase',
  COUNTER_TREND:       'Counter Trend',
  NO_CONFIRMATION:     'No Confirmation',
  OVERTRADE:           'Overtrade',
  WRONG_LEVEL:         'Wrong Level',
  IGNORED_VWAP:        'Ignored VWAP',
  IGNORED_STRUCTURE:   'Ignored Structure',
  BAD_STOP:            'Bad Stop',
  BAD_TARGET:          'Bad Target',
  SIZE_TOO_BIG:        'Size Too Big',
  EMOTIONAL_TRADE:     'Emotional Trade',
  SHOULD_HAVE_SKIPPED: 'Should Have Skipped',
};

// ── Outcome type ──────────────────────────────────────────────────────────────
export const OUTCOME_TYPES = [
  'WIN',
  'LOSS',
  'NEUTRAL',
  'STRONG_WIN',
  'STRONG_LOSS',
] as const;
export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export const OUTCOME_TYPE_LABELS: Record<OutcomeType, string> = {
  WIN:         'Win',
  LOSS:        'Loss',
  NEUTRAL:     'Neutral',
  STRONG_WIN:  'Strong Win',
  STRONG_LOSS: 'Strong Loss',
};

// ── Miss reason ───────────────────────────────────────────────────────────────
export const MISS_REASONS = [
  'DID_NOT_SEE',
  'HESITATION',
  'DISTRACTION',
  'NO_PLAN',
  'LOW_CONFIDENCE',
  'EXECUTION_DELAY',
  'RISK_LIMIT_REACHED',
] as const;
export type MissReason = (typeof MISS_REASONS)[number];

export const MISS_REASON_LABELS: Record<MissReason, string> = {
  DID_NOT_SEE:        'Did Not See',
  HESITATION:         'Hesitation',
  DISTRACTION:        'Distraction',
  NO_PLAN:            'No Plan',
  LOW_CONFIDENCE:     'Low Confidence',
  EXECUTION_DELAY:    'Execution Delay',
  RISK_LIMIT_REACHED: 'Risk Limit Reached',
};

// ── Context ───────────────────────────────────────────────────────────────────
/** Market conditions when the trade was taken. Multi-select; edge from combinations. */
export const CONTEXTS = [
  'TREND',
  'RANGE',
  'TRANSITION',
  'ABOVE_VWAP',
  'BELOW_VWAP',
] as const;
export type Context = (typeof CONTEXTS)[number];

export const CONTEXT_LABELS: Record<Context, string> = {
  TREND:      'Trend',
  RANGE:      'Range',
  TRANSITION: 'Transition',
  ABOVE_VWAP: 'Above VWAP',
  BELOW_VWAP: 'Below VWAP',
};

// ── Location ──────────────────────────────────────────────────────────────────
/** Specific price levels forming the battlefield. Multi-select; more = higher confluence. */
export const LOCATIONS = [
  'RANGE_HIGH',
  'RANGE_LOW',
  'MID_RANGE',
  'PDH',
  'PDL',
  'PREMARKET_HIGH',
  'PREMARKET_LOW',
  'AH_HIGH',
  'AH_LOW',
  'VWAP',
  'WHOLE_NUMBER',
] as const;
export type Location = (typeof LOCATIONS)[number];

export const LOCATION_LABELS: Record<Location, string> = {
  RANGE_HIGH:     'Range High',
  RANGE_LOW:      'Range Low',
  MID_RANGE:      'Mid Range',
  PDH:            'PDH',
  PDL:            'PDL',
  PREMARKET_HIGH: 'Premarket High',
  PREMARKET_LOW:  'Premarket Low',
  AH_HIGH:        'AH High',
  AH_LOW:         'AH Low',
  VWAP:           'VWAP',
  WHOLE_NUMBER:   'Whole Number',
};

// ── InvalidationType ──────────────────────────────────────────────────────────
/** Structured condition that voids the trade idea. Required for analytics. */
export const INVALIDATION_TYPES = [
  'RECLAIM_VWAP',
  'BREAK_RANGE_HIGH',
  'BREAK_RANGE_LOW',
  'HOLD_ABOVE_VWAP',
  'HOLD_BELOW_VWAP',
  'STRUCTURE_BREAK',
] as const;
export type InvalidationType = (typeof INVALIDATION_TYPES)[number];

export const INVALIDATION_TYPE_LABELS: Record<InvalidationType, string> = {
  RECLAIM_VWAP:    'Reclaim VWAP',
  BREAK_RANGE_HIGH:'Break Range High',
  BREAK_RANGE_LOW: 'Break Range Low',
  HOLD_ABOVE_VWAP: 'Hold Above VWAP',
  HOLD_BELOW_VWAP: 'Hold Below VWAP',
  STRUCTURE_BREAK: 'Structure Break',
};

// ── EntryTrigger ──────────────────────────────────────────────────────────────
/** Execution timing signal — what candle/pattern triggered the entry. Single-select. */
export const ENTRY_TRIGGERS = [
  'EMA9_21_BULLISH_CROSS',
  'EMA9_21_BEARISH_CROSS',
  'BREAK_STRUCTURE',
  'REJECTION_CANDLE',
] as const;
export type EntryTrigger = (typeof ENTRY_TRIGGERS)[number];

export const ENTRY_TRIGGER_LABELS: Record<EntryTrigger, string> = {
  EMA9_21_BULLISH_CROSS: 'EMA 9/21 Bullish Cross',
  EMA9_21_BEARISH_CROSS: 'EMA 9/21 Bearish Cross',
  BREAK_STRUCTURE:       'Break Structure',
  REJECTION_CANDLE:      'Rejection Candle',
};

// ── Review layer ──────────────────────────────────────────────────────────────

export const REVIEW_INTENTS = [
  'TREND_CONTINUATION',
  'REVERSAL',
  'RANGE_PLAY',
  'BREAKOUT',
  'FAILED_MOVE_TRAP',
] as const;
export type ReviewIntent = (typeof REVIEW_INTENTS)[number];
export const REVIEW_INTENT_LABELS: Record<ReviewIntent, string> = {
  TREND_CONTINUATION: 'Trend Continuation',
  REVERSAL: 'Reversal',
  RANGE_PLAY: 'Range Play',
  BREAKOUT: 'Breakout',
  FAILED_MOVE_TRAP: 'Failed Move / Trap',
};

export const MARKET_OUTCOMES = [
  'TREND_UP',
  'TREND_DOWN',
  'RANGE_CHOP',
  'FAILED_MOVE',
  'BREAKOUT_CONTINUATION',
  'REVERSAL',
] as const;
export type MarketOutcome = (typeof MARKET_OUTCOMES)[number];
export const MARKET_OUTCOME_LABELS: Record<MarketOutcome, string> = {
  TREND_UP: 'Trend Up',
  TREND_DOWN: 'Trend Down',
  RANGE_CHOP: 'Range / Chop',
  FAILED_MOVE: 'Failed Move',
  BREAKOUT_CONTINUATION: 'Breakout Continuation',
  REVERSAL: 'Reversal',
};

export const TRADE_RESULTS = ['WIN', 'LOSS', 'BREAKEVEN'] as const;
export type TradeResult = (typeof TRADE_RESULTS)[number];
export const TRADE_RESULT_LABELS: Record<TradeResult, string> = {
  WIN: 'Win',
  LOSS: 'Loss',
  BREAKEVEN: 'Breakeven',
};

export const SETUP_VALIDITIES = ['CORRECT_READ', 'WRONG_READ', 'PARTIAL'] as const;
export type SetupValidity = (typeof SETUP_VALIDITIES)[number];
export const SETUP_VALIDITY_LABELS: Record<SetupValidity, string> = {
  CORRECT_READ: 'Correct Read',
  WRONG_READ: 'Wrong Read',
  PARTIAL: 'Partial',
};

export const MISTAKE_TYPES = [
  'BAD_SETUP',
  'WRONG_CONTEXT',
  'BAD_LOCATION',
  'EARLY_ENTRY',
  'LATE_ENTRY',
  'NO_TRIGGER',
  'WRONG_STOP',
  'NO_PLAN',
  'EMOTIONAL',
] as const;
export type MistakeType = (typeof MISTAKE_TYPES)[number];
export const MISTAKE_TYPE_LABELS: Record<MistakeType, string> = {
  BAD_SETUP:     'Bad Setup',
  WRONG_CONTEXT: 'Wrong Context',
  BAD_LOCATION:  'Bad Location',
  EARLY_ENTRY:   'Early Entry',
  LATE_ENTRY:    'Late Entry',
  NO_TRIGGER:    'No Trigger',
  WRONG_STOP:    'Wrong Stop',
  NO_PLAN:       'No Plan',
  EMOTIONAL:     'Emotional',
};

// ── Direction (new structured enum, uppercase) ────────────────────────────────
/** Uppercase direction enum used in TradeSetup reflection (bestDirection). */
export const DIRECTION_ENUM_VALUES = ['LONG', 'SHORT'] as const;
export type DirectionEnum = (typeof DIRECTION_ENUM_VALUES)[number];

export const DIRECTION_ENUM_LABELS: Record<DirectionEnum, string> = {
  LONG:  'Long',
  SHORT: 'Short',
};

// ── Legacy direction (lowercase, used in TradeSetup.direction) ────────────────
export const GRADES = ['A+', 'A', 'B', 'C', 'D'] as const;
export const ACTION_TYPES = ['starter', 'add', 'trim', 'exit'] as const;
export const DIRECTIONS = ['long', 'short'] as const;

export type Grade = (typeof GRADES)[number];
export type ActionType = (typeof ACTION_TYPES)[number];
export type Direction = (typeof DIRECTIONS)[number]; // legacy lowercase
export type SetupStatus = 'open' | 'closed';

// ── Sub-models ────────────────────────────────────────────────────────────────
export interface Execution {
  id: string;
  setupId: string;
  actionType: ActionType;
  price: number;
  size: number;
  executionTime: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

// ── TradeSetup ────────────────────────────────────────────────────────────────
export interface TradeSetup {
  id: string;
  /** Trading day in YYYY-MM-DD format, anchored to America/New_York. */
  setupDate: string;
  symbol: string;
  /** Legacy lowercase direction string ('long' | 'short'). */
  direction: Direction;
  setupType: SetupType;

  // ── Canonical market-structure model ─────────────────────────────────────
  /** Canonical source of truth for the trade trigger(s). */
  triggers: Trigger[];
  dayType: DayType | null;
  /** Canonical single location field. */
  location: TradeLocation | null;
  liquidityContext: LiquidityContext | null;
  keyLevels: KeyLevel[];
  entryType: EntryType | null;
  entryTiming: EntryTiming | null;
  confirmation: Confirmation[];

  // ── Layer 1: intent / plan ─────────────────────────────────────────────────
  /** Canonical thesis / plan classification. */
  intent: ReviewIntent | null;
  /** @deprecated Legacy string fallback derived from `triggers`. */
  trigger: string;
  /** Structured enum that voids the trade idea. */
  invalidationType: InvalidationType;
  /** Optional free-text nuance on top of the structured type. */
  invalidationNote: string | null;
  /** Thesis note / planned objective. Kept as free text on top of structured intent. */
  decisionTarget: string;
  /** @deprecated Legacy entry text fallback derived from structured entry fields when possible. */
  riskEntry: string;
  /** Legacy stop text field retained for compatibility. */
  riskStop: string;
  /** Legacy target text field retained for compatibility. */
  riskTarget: string;
  /** @deprecated Legacy single trigger enum retained for compatibility only. */
  triggerType: TriggerType | null;
  /** Structured numeric entry level. */
  entryPrice: number | null;
  /** Structured numeric stop level. */
  stopPrice: number | null;
  /** Structured numeric target level. */
  targetPrice: number | null;

  // ── 4-part classification model ───────────────────────────────────────────
  /** @deprecated Legacy multi-context field derived from `dayType` and `location`. */
  contexts: Context[];
  /** @deprecated Legacy multi-location field derived from `keyLevels`. */
  locations: Location[];
  /** @deprecated Legacy single execution-trigger field retained for compatibility only. */
  entryTrigger: EntryTrigger | null;

  // ── Layer 2: market reality at entry ──────────────────────────────────────
  /** Actual regime at the time of this specific trade. */
  trueRegime: Regime | null;
  vwapState: VWAPState | null;
  structure: StructureType | null;
  /** Trade-relative alignment (distinct from day-wide context). */
  alignment: Alignment | null;

  // ── Layer 3: reflection ───────────────────────────────────────────────────
  mistakeTags: MistakeTag[];
  executionScore: number | null;
  readScore: number | null;
  disciplineScore: number | null;
  /** What was the best setup available in hindsight. */
  bestSetupType: SetupType | null;
  /** What was the best direction in hindsight. */
  bestDirection: DirectionEnum | null;
  /** Whether this trade should have been taken at all. */
  shouldTrade: boolean | null;

  // ── Review layer ──────────────────────────────────────────────────────────
  /** What the market actually did after entry. */
  marketOutcome: MarketOutcome | null;
  /** Monetary outcome of the trade. */
  tradeResult: TradeResult | null;
  /** Whether the setup read was right, wrong, or partially right. */
  setupValidity: SetupValidity | null;
  /** @deprecated Legacy review outcome retained only for migration compatibility. */
  outcome?: TradeResult | null;
  /** @deprecated Legacy setup-quality field retained only for migration compatibility. */
  setupResult?: 'PLAYED_OUT' | 'FAILED' | 'UNCLEAR' | null;
  /** Execution or planning mistakes (multi-select). */
  mistakeTypes: MistakeType[];
  /** Free-text post-trade note. */
  reviewNote: string | null;

  // ── Meta ──────────────────────────────────────────────────────────────────
  /** When true this is an ideal/hypothetical trade — P&L is tracked separately from executed setups. */
  isIdeal: boolean;
  initialGrade: Grade | null;
  status: SetupStatus;
  /** Optional extra context (does not replace structured fields). */
  overallNotes: string;
  /** Optional human-readable name shown in chart toggle UI. */
  setupName: string | null;
  executions: Execution[];
  createdAt: string;
  updatedAt: string;
  /** Day-level market context. Null when no DayContext has been saved for this date. */
  dayContext: import('./dayContext').DayContext | null;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
export const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/25',
  A:   'bg-blue-500/10 text-blue-400 ring-blue-500/25',
  B:   'bg-amber-500/10 text-amber-400 ring-amber-500/25',
  C:   'bg-zinc-700/50 text-zinc-400 ring-zinc-600/50',
  D:   'bg-red-500/10 text-red-400 ring-red-500/25',
};

export const ACTION_DOT_COLORS: Record<ActionType, string> = {
  starter: 'bg-blue-500',
  add:     'bg-emerald-500',
  trim:    'bg-amber-500',
  exit:    'bg-rose-500',
};

export const ACTION_BORDER_COLORS: Record<ActionType, string> = {
  starter: 'border-l-blue-400',
  add:     'border-l-emerald-500',
  trim:    'border-l-amber-400',
  exit:    'border-l-rose-500',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  starter: 'Starter',
  add:     'Add',
  trim:    'Trim',
  exit:    'Exit',
};
