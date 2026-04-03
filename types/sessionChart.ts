import type { ActionType } from '@/types/setup';
import type { Execution } from '@/types/setup';

export type SessionType = 'premarket' | 'regular' | 'aftermarket';

export interface SessionCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  /** Which trading session this candle belongs to (populated when source file uses `sessions`). */
  session?: SessionType;
}

export interface SessionLevels {
  previous_close: number;
  previous_day_high: number;
  previous_day_low: number;
  premarket_high: number;
  premarket_low: number;
  opening_range_high: number;
  opening_range_low: number;
  /** RTH session high/low when present in extended-hours files */
  regular_high?: number;
  regular_low?: number;
  /** After-hours session high/low */
  aftermarket_high?: number;
  aftermarket_low?: number;
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
