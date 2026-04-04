import type { MarketContext, Regime, Transition, DayType } from './setup';

/** Day-level market context shared by all setups on the same trading date. */
export interface DayContext {
  id: string;
  /** YYYY-MM-DD trading day. */
  date: string;
  /** Structured day classification. Preferred over legacy marketContext. */
  dayType: DayType | null;
  /** @legacy String-based context retained for migration safety. Prefer dayType. */
  marketContext: MarketContext | null;
  initialRegime: Regime | null;
  /** Market regime during the active session (distinct from the open regime). */
  entryRegime: Regime | null;
  transition: Transition | null;
  // alignment removed — trade-relative; now lives on TradeSetup.alignment
  notes: string;
  createdAt: string;
  updatedAt: string;
}
