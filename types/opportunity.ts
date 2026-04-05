import type {
  Regime,
  VWAPState,
  DayType,
  StructureType,
  SetupType,
  TriggerType,
  Alignment,
  OutcomeType,
  MissReason,
} from './setup';

/** Direction enum used in MarketOpportunity (uppercase, not legacy string). */
export type OpportunityDirection = 'LONG' | 'SHORT';

export interface MarketOpportunity {
  id: string;
  symbol: string;
  /** ISO date string. */
  date: string;

  // ── Required market state ──
  trueRegime: Regime;
  vwapState: VWAPState;
  dayType: DayType;
  structure: StructureType;

  // ── Classification ──
  setupType: SetupType;
  triggerType: TriggerType | null;
  direction: OpportunityDirection;
  alignment: Alignment | null;

  // ── Outcome of the opportunity itself ──
  outcome: OutcomeType | null;
  maxFavorable: number | null;
  maxAdverse: number | null;

  // ── Execution decision ──
  taken: boolean;
  missReason: MissReason | null;
  notes: string | null;

  // ── Quality ──
  qualityScore: number | null;
  isAPlus: boolean | null;

  createdAt: string;
  updatedAt: string;
}

/** Fields required to create a new opportunity. */
export type CreateOpportunityInput = Omit<MarketOpportunity, 'id' | 'createdAt' | 'updatedAt'>;

/** All fields are optional for a partial update. */
export type UpdateOpportunityInput = Partial<CreateOpportunityInput>;
