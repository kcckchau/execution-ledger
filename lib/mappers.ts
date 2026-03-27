import type { TradeSetup, Execution, SetupReview } from '@/types/setup';

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
  marketContext: string;
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
  review: unknown;
  executions: DbExecution[];
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

export function mapSetup(s: DbSetup): TradeSetup {
  return {
    id: s.id,
    setupDate: s.setupDate,
    symbol: s.symbol,
    direction: s.direction as TradeSetup['direction'],
    marketContext: s.marketContext as TradeSetup['marketContext'],
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
    review: s.review ? (s.review as SetupReview) : null,
    executions: s.executions.map(mapExecution),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
