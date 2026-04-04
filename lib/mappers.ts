import type { TradeSetup, Execution, SetupReview } from '@/types/setup';
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

type DbSetup = {
  id: string;
  setupDate: string;
  symbol: string;
  direction: string;
  setupType: string;
  trigger: string;
  invalidation: string;
  decisionTarget: string;
  riskEntry: string;
  riskStop: string;
  riskTarget: string;
  initialGrade: string | null;
  status: string;
  overallNotes: string;
  setupName: string | null;
  review: unknown;
  executions: DbExecution[];
  createdAt: Date;
  updatedAt: Date;
};

type DbDayContext = {
  id: string;
  date: string;
  marketContext: string | null;
  initialRegime: string | null;
  entryRegime: string | null;
  transition: string | null;
  alignment: string | null;
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
    marketContext: (d.marketContext as DayContext['marketContext']) ?? null,
    initialRegime: (d.initialRegime as DayContext['initialRegime']) ?? null,
    entryRegime: (d.entryRegime as DayContext['entryRegime']) ?? null,
    transition: (d.transition as DayContext['transition']) ?? null,
    alignment: (d.alignment as DayContext['alignment']) ?? null,
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
    trigger: s.trigger,
    invalidation: s.invalidation,
    decisionTarget: s.decisionTarget,
    riskEntry: s.riskEntry,
    riskStop: s.riskStop,
    riskTarget: s.riskTarget,
    initialGrade: (s.initialGrade as TradeSetup['initialGrade']) ?? null,
    status: s.status as TradeSetup['status'],
    overallNotes: s.overallNotes,
    setupName: s.setupName ?? null,
    review: s.review ? (s.review as SetupReview) : null,
    executions: s.executions.map(mapExecution),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    dayContext,
  };
}
