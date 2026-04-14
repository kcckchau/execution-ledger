import type {
  TradeSetup,
  Execution,
  TriggerType,
  Trigger,
  Regime,
  VWAPState,
  StructureType,
  Alignment,
  DayType,
  TradeLocation,
  LiquidityContext,
  KeyLevel,
  EntryType,
  EntryTiming,
  Confirmation,
  MistakeTag,
  SetupType,
  DirectionEnum,
  Context,
  Location,
  EntryTrigger,
  InvalidationType,
  ReviewIntent,
  TradeResult,
  SetupValidity,
  MistakeType,
  MarketOutcome,
} from '@/types/setup';
import type { DayContext } from '@/types/dayContext';

type DbExecution = {
  id: string;
  setupId: string;
  actionType: string;
  price: number;
  size: number;
  executionTime: Date;
  note: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DbSetup = {
  id: string;
  setupDate: string;
  symbol: string;
  direction: string;
  setupType: string;
  triggers: string[];
  dayType: string | null;
  location: string | null;
  liquidityContext: string | null;
  keyLevels: string[];
  entryType: string | null;
  entryTiming: string | null;
  confirmation: string[];
  // Layer 1 legacy text
  trigger: string;
  decisionTarget: string;
  // Structured invalidation
  invalidationType: string;
  invalidationNote: string | null;
  riskEntry: string;
  riskStop: string;
  riskTarget: string;
  // Layer 1 structured
  triggerType: string | null;
  entryPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  // 4-part classification
  contexts: string[];
  locations: string[];
  entryTrigger: string | null;
  // Layer 2
  trueRegime: string | null;
  vwapState: string | null;
  structure: string | null;
  alignment: string | null;
  // Layer 3
  mistakeTags: string[];
  executionScore: number | null;
  readScore: number | null;
  disciplineScore: number | null;
  bestSetupType: string | null;
  bestDirection: string | null;
  shouldTrade: boolean | null;
  // Review layer
  intent?: string | null;
  tradeResult?: string | null;
  setupValidity?: string | null;
  mistakeTypes: string[];
  marketOutcome: string | null;
  reviewNote: string | null;
  outcome?: string | null;
  setupResult?: string | null;
  // Meta
  isIdeal: boolean;
  initialGrade: string | null;
  status: string;
  overallNotes: string;
  setupName: string | null;
  executions: DbExecution[];
  createdAt: Date;
  updatedAt: Date;
};

type DbDayContext = {
  id: string;
  date: string;
  dayType: string | null;
  marketContext: string | null;
  initialRegime: string | null;
  entryRegime: string | null;
  transition: string | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeSetupType(value: string): TradeSetup['setupType'] {
  switch (value) {
    case 'VWAP_RECLAIM':
    case 'VWAP_REJECT':
    case 'VWAP_PULLBACK':
      return 'VWAP_PLAY';
    case 'ORB_BREAK':
      return 'BREAKOUT';
    case 'SWEEP_FAIL':
    case 'FAILED_BREAKOUT':
    case 'FAILED_BREAKDOWN':
    case 'FLIP':
      return 'FAILED_MOVE';
    case 'RANGE_RECLAIM':
    case 'RANGE_REJECT':
      return 'RANGE';
    case 'BREAKOUT':
      return 'BREAKOUT';
    case 'BREAKDOWN':
      return 'BREAKDOWN';
    case 'TREND_PULLBACK':
      return 'TREND_PULLBACK';
    case 'FAILED_MOVE':
      return 'FAILED_MOVE';
    case 'VWAP_PLAY':
      return 'VWAP_PLAY';
    case 'RANGE':
    default:
      return 'RANGE';
  }
}

function normalizeDayType(value: string | null): DayType | null {
  switch (value) {
    case 'TREND':
      return 'TREND';
    case 'TRANSITION':
      return 'TRANSITION';
    case 'CHOP':
    case 'OPEN_DRIVE':
    case 'OPEN_REJECTION':
    case 'RANGE':
      return 'RANGE';
    default:
      return null;
  }
}

function normalizeIntent(value: string | null | undefined, setupType: string): ReviewIntent | null {
  switch (value) {
    case 'TREND_CONTINUATION':
    case 'REVERSAL':
    case 'RANGE_PLAY':
    case 'BREAKOUT':
    case 'FAILED_MOVE_TRAP':
      return value;
    default:
      break;
  }

  switch (setupType) {
    case 'TREND_PULLBACK':
      return 'TREND_CONTINUATION';
    case 'BREAKOUT':
    case 'ORB_BREAK':
      return 'BREAKOUT';
    case 'BREAKDOWN':
    case 'FLIP':
      return 'REVERSAL';
    case 'RANGE':
    case 'RANGE_RECLAIM':
    case 'RANGE_REJECT':
      return 'RANGE_PLAY';
    case 'FAILED_MOVE':
    case 'FAILED_BREAKOUT':
    case 'FAILED_BREAKDOWN':
    case 'SWEEP_FAIL':
      return 'FAILED_MOVE_TRAP';
    case 'VWAP_PLAY':
    case 'VWAP_RECLAIM':
    case 'VWAP_REJECT':
    case 'VWAP_PULLBACK':
      return 'TREND_CONTINUATION';
    default:
      return null;
  }
}

function normalizeTradeResult(value: string | null | undefined): TradeResult | null {
  switch (value) {
    case 'WIN':
    case 'LOSS':
    case 'BREAKEVEN':
      return value;
    default:
      return null;
  }
}

function normalizeSetupValidity(value: string | null | undefined): SetupValidity | null {
  switch (value) {
    case 'CORRECT_READ':
    case 'WRONG_READ':
    case 'PARTIAL':
      return value;
    case 'PLAYED_OUT':
      return 'CORRECT_READ';
    case 'FAILED':
      return 'WRONG_READ';
    case 'UNCLEAR':
      return 'PARTIAL';
    default:
      return null;
  }
}

function normalizeMarketOutcome(value: string | null | undefined): MarketOutcome | null {
  switch (value) {
    case 'TREND_UP':
    case 'TREND_DOWN':
    case 'RANGE_CHOP':
    case 'FAILED_MOVE':
    case 'BREAKOUT_CONTINUATION':
    case 'REVERSAL':
      return value;
    case 'TREND_CONTINUATION':
      return 'TREND_UP';
    case 'RANGE_CONTINUATION':
      return 'RANGE_CHOP';
    case 'VWAP_RECLAIM':
      return 'TREND_UP';
    case 'VWAP_REJECT':
      return 'FAILED_MOVE';
    default:
      return null;
  }
}

export function mapExecution(e: DbExecution): Execution {
  return {
    id: e.id,
    setupId: e.setupId,
    actionType: e.actionType as Execution['actionType'],
    price: e.price,
    size: e.size,
    executionTime: e.executionTime.toISOString(),
    note: e.note,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function mapDayContext(d: DbDayContext): DayContext {
  return {
    id: d.id,
    date: d.date,
    dayType: normalizeDayType(d.dayType) as DayContext['dayType'],
    marketContext: (d.marketContext as DayContext['marketContext']) ?? null,
    initialRegime: (d.initialRegime as DayContext['initialRegime']) ?? null,
    entryRegime: (d.entryRegime as DayContext['entryRegime']) ?? null,
    transition: (d.transition as DayContext['transition']) ?? null,
    notes: d.notes,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt),
  };
}

export function mapSetup(s: DbSetup, dayContext: DayContext | null = null): TradeSetup {
  const marketOutcome = normalizeMarketOutcome(s.marketOutcome);
  const tradeResult = normalizeTradeResult(s.tradeResult ?? s.outcome);
  const setupValidity = normalizeSetupValidity(s.setupValidity ?? s.setupResult);

  return {
    id: s.id,
    setupDate: s.setupDate,
    symbol: s.symbol,
    direction: s.direction as TradeSetup['direction'],
    setupType: normalizeSetupType(s.setupType),
    triggers: (s.triggers as Trigger[]) ?? [],
    dayType: normalizeDayType(s.dayType),
    location: (s.location as TradeLocation) ?? null,
    liquidityContext: (s.liquidityContext as LiquidityContext) ?? null,
    keyLevels: (s.keyLevels as KeyLevel[]) ?? [],
    entryType: (s.entryType as EntryType) ?? null,
    entryTiming: (s.entryTiming as EntryTiming) ?? null,
    confirmation: (s.confirmation as Confirmation[]) ?? [],
    // Layer 1 legacy
    trigger: s.trigger,
    decisionTarget: s.decisionTarget,
    // Structured invalidation
    invalidationType: (s.invalidationType as InvalidationType),
    invalidationNote: s.invalidationNote ?? null,
    riskEntry: s.riskEntry,
    riskStop: s.riskStop,
    riskTarget: s.riskTarget,
    // Layer 1 structured
    triggerType: (s.triggerType as TriggerType) ?? null,
    entryPrice: s.entryPrice ?? null,
    stopPrice: s.stopPrice ?? null,
    targetPrice: s.targetPrice ?? null,
    // 4-part classification
    contexts: (s.contexts as Context[]) ?? [],
    locations: (s.locations as Location[]) ?? [],
    entryTrigger: (s.entryTrigger as EntryTrigger) ?? null,
    // Layer 2
    trueRegime: (s.trueRegime as Regime) ?? null,
    vwapState: (s.vwapState as VWAPState) ?? null,
    structure: (s.structure as StructureType) ?? null,
    alignment: (s.alignment as Alignment) ?? null,
    // Layer 3
    mistakeTags: (s.mistakeTags as MistakeTag[]) ?? [],
    executionScore: s.executionScore ?? null,
    readScore: s.readScore ?? null,
    disciplineScore: s.disciplineScore ?? null,
    bestSetupType: (s.bestSetupType as SetupType) ?? null,
    bestDirection: (s.bestDirection as DirectionEnum) ?? null,
    shouldTrade: s.shouldTrade ?? null,
    // Review layer
    intent: normalizeIntent(s.intent, s.setupType),
    marketOutcome,
    tradeResult,
    setupValidity,
    outcome: tradeResult,
    setupResult: s.setupResult ?? null,
    mistakeTypes: (s.mistakeTypes as MistakeType[]) ?? [],
    reviewNote: s.reviewNote ?? null,
    // Meta
    isIdeal: s.isIdeal,
    initialGrade: (s.initialGrade as TradeSetup['initialGrade']) ?? null,
    status: s.status as TradeSetup['status'],
    overallNotes: s.overallNotes,
    setupName: s.setupName ?? null,
    executions: s.executions.map(mapExecution),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    dayContext,
  };
}
