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
  // Original values (kept for legacy data)
  'VWAP_RECLAIM',
  'VWAP_REJECT',
  'BREAKOUT',
  'BREAKDOWN',
  'RANGE',
  'FLIP',
  // New analytical values
  'VWAP_PULLBACK',
  'ORB_BREAK',
  'SWEEP_FAIL',
  'RANGE_RECLAIM',
  'RANGE_REJECT',
  'FAILED_BREAKOUT',
  'FAILED_BREAKDOWN',
] as const;

export type SetupType = (typeof SETUP_TYPES)[number];

export const SETUP_TYPE_LABELS: Record<SetupType, string> = {
  VWAP_RECLAIM:     'VWAP Reclaim',
  VWAP_REJECT:      'VWAP Reject',
  BREAKOUT:         'Breakout',
  BREAKDOWN:        'Breakdown',
  RANGE:            'Range',
  FLIP:             'Flip',
  VWAP_PULLBACK:    'VWAP Pullback',
  ORB_BREAK:        'ORB Break',
  SWEEP_FAIL:       'Sweep Fail',
  RANGE_RECLAIM:    'Range Reclaim',
  RANGE_REJECT:     'Range Reject',
  FAILED_BREAKOUT:  'Failed Breakout',
  FAILED_BREAKDOWN: 'Failed Breakdown',
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
  'CHOP',
  'RANGE',
  'OPEN_DRIVE',
  'OPEN_REJECTION',
  'TRANSITION',
] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  TREND:          'Trend',
  CHOP:           'Chop',
  RANGE:          'Range',
  OPEN_DRIVE:     'Open Drive',
  OPEN_REJECTION: 'Open Rejection',
  TRANSITION:     'Transition',
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

export const OUTCOMES = ['WIN', 'LOSS', 'BREAKEVEN'] as const;
export type Outcome = (typeof OUTCOMES)[number];
export const OUTCOME_LABELS: Record<Outcome, string> = {
  WIN:       'Win',
  LOSS:      'Loss',
  BREAKEVEN: 'Breakeven',
};

export const SETUP_RESULTS = ['PLAYED_OUT', 'FAILED', 'UNCLEAR'] as const;
export type SetupResult = (typeof SETUP_RESULTS)[number];
export const SETUP_RESULT_LABELS: Record<SetupResult, string> = {
  PLAYED_OUT: 'Played Out',
  FAILED:     'Failed',
  UNCLEAR:    'Unclear',
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

export const MARKET_OUTCOMES = [
  'VWAP_RECLAIM',
  'VWAP_REJECT',
  'TREND_CONTINUATION',
  'RANGE_CONTINUATION',
  'REVERSAL',
] as const;
export type MarketOutcome = (typeof MARKET_OUTCOMES)[number];
export const MARKET_OUTCOME_LABELS: Record<MarketOutcome, string> = {
  VWAP_RECLAIM:       'VWAP Reclaim',
  VWAP_REJECT:        'VWAP Reject',
  TREND_CONTINUATION: 'Trend Continuation',
  RANGE_CONTINUATION: 'Range Continuation',
  REVERSAL:           'Reversal',
};

// ── Direction (new structured enum, uppercase) ────────────────────────────────
/** Uppercase direction enum used in MarketOpportunity and TradeSetup reflection. */
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

  // ── Layer 1: intent / plan ─────────────────────────────────────────────────
  /** What must happen to enter (legacy text field). */
  trigger: string;
  /** Structured enum that voids the trade idea. */
  invalidationType: InvalidationType;
  /** Optional free-text nuance on top of the structured type. */
  invalidationNote: string | null;
  /** Planned objective in the idea phase (legacy text field). */
  decisionTarget: string;
  /** Planned entry level (legacy text field). */
  riskEntry: string;
  /** Planned stop (legacy text field). */
  riskStop: string;
  /** Planned take-profit / exit objective (legacy text field). */
  riskTarget: string;
  /** Structured trigger classification. */
  triggerType: TriggerType | null;
  /** Structured numeric entry level. */
  entryPrice: number | null;
  /** Structured numeric stop level. */
  stopPrice: number | null;
  /** Structured numeric target level. */
  targetPrice: number | null;

  // ── 4-part classification model ───────────────────────────────────────────
  /** WHEN it works — market conditions at entry. Required ≥1 for new records. */
  contexts: Context[];
  /** WHERE — exact price levels at play. Optional. */
  locations: Location[];
  /** HOW to enter — execution timing signal. Required for new records. */
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
  /** Monetary outcome of the trade. */
  outcome: Outcome | null;
  /** Whether the trade idea itself was correct (independent of P&L). */
  setupResult: SetupResult | null;
  /** Execution or planning mistakes (multi-select). */
  mistakeTypes: MistakeType[];
  /** What the market actually did after entry. */
  marketOutcome: MarketOutcome | null;
  /** Free-text post-trade note. */
  reviewNote: string | null;

  // ── Meta ──────────────────────────────────────────────────────────────────
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
