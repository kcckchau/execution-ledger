import type {
  TradeSetup,
  Execution,
  TriggerType,
  Regime,
  VWAPState,
  StructureType,
  Alignment,
  MistakeTag,
  SetupType,
  DirectionEnum,
  Context,
  Location,
  EntryTrigger,
  InvalidationType,
  Outcome,
  SetupResult,
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
  outcome: string | null;
  setupResult: string | null;
  mistakeTypes: string[];
  marketOutcome: string | null;
  reviewNote: string | null;
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
    dayType: (d.dayType as DayContext['dayType']) ?? null,
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
  return {
    id: s.id,
    setupDate: s.setupDate,
    symbol: s.symbol,
    direction: s.direction as TradeSetup['direction'],
    setupType: s.setupType as TradeSetup['setupType'],
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
    outcome: (s.outcome as Outcome) ?? null,
    setupResult: (s.setupResult as SetupResult) ?? null,
    mistakeTypes: (s.mistakeTypes as MistakeType[]) ?? [],
    marketOutcome: (s.marketOutcome as MarketOutcome) ?? null,
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
