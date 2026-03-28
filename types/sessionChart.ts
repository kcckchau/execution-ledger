import type { ActionType } from '@/types/setup';
import type { Execution } from '@/types/setup';

export interface SessionCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
}

export interface SessionLevels {
  previous_close: number;
  previous_day_high: number;
  previous_day_low: number;
  premarket_high: number;
  premarket_low: number;
  opening_range_high: number;
  opening_range_low: number;
}

/** Session payload for the intraday chart (1-minute bars + levels). */
export interface SessionChartData {
  symbol: string;
  tradingDate: string;
  timezone: string;
  barSize: string;
  levels: SessionLevels;
  candles: SessionCandle[];
}

/** Minimal execution shape for chart markers. */
export interface SessionChartExecution {
  time: string;
  price: number;
  action: ActionType;
}

/** Accept chart executions or app `Execution` rows (maps `executionTime` / `actionType`). */
export type SessionChartExecutionProp =
  | SessionChartExecution
  | Pick<Execution, 'executionTime' | 'price' | 'actionType'>;
