import type { MarketContext, Regime, Transition, Alignment } from './setup';

/** Day-level market context shared by all setups on the same trading date. */
export interface DayContext {
  id: string;
  /** YYYY-MM-DD trading day. */
  date: string;
  marketContext: MarketContext | null;
  initialRegime: Regime | null;
  /** Market regime during the active session (distinct from the open regime). */
  entryRegime: Regime | null;
  transition: Transition | null;
  alignment: Alignment | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
