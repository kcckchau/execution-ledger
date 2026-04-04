-- Migration: intelligence_refactor
-- Safe, additive migration. No existing data is destroyed.
-- Adds new enums, extends existing enums, adds Layer 2/3 fields to TradeSetup,
-- adds dayType to DayContext, and creates the MarketOpportunity table.


-- ── 1. Create new enum types ──────────────────────────────────────────────────

CREATE TYPE "Direction" AS ENUM ('LONG', 'SHORT');

CREATE TYPE "VWAPState" AS ENUM (
  'ABOVE_ACCEPT',
  'BELOW_ACCEPT',
  'REJECTING_FROM_ABOVE',
  'REJECTING_FROM_BELOW',
  'CHOP_AROUND'
);

CREATE TYPE "DayType" AS ENUM (
  'TREND',
  'CHOP',
  'RANGE',
  'OPEN_DRIVE',
  'OPEN_REJECTION',
  'TRANSITION'
);

CREATE TYPE "StructureType" AS ENUM (
  'HH_HL',
  'LH_LL',
  'RANGE',
  'BREAKOUT_FAIL',
  'BREAKDOWN_FAIL',
  'REVERSAL'
);

CREATE TYPE "TriggerType" AS ENUM (
  'VWAP_RECLAIM',
  'VWAP_REJECT',
  'ORB_BREAK',
  'SWEEP_FAIL',
  'RANGE_HIGH_REJECT',
  'RANGE_LOW_RECLAIM',
  'BREAKOUT_CONFIRM',
  'BREAKDOWN_CONFIRM'
);

CREATE TYPE "MistakeTag" AS ENUM (
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
  'SHOULD_HAVE_SKIPPED'
);

CREATE TYPE "OutcomeType" AS ENUM (
  'WIN',
  'LOSS',
  'NEUTRAL',
  'STRONG_WIN',
  'STRONG_LOSS'
);

CREATE TYPE "MissReason" AS ENUM (
  'DID_NOT_SEE',
  'HESITATION',
  'DISTRACTION',
  'NO_PLAN',
  'LOW_CONFIDENCE',
  'EXECUTION_DELAY',
  'RISK_LIMIT_REACHED'
);


-- ── 2. Extend existing enums (additive only) ──────────────────────────────────
-- PostgreSQL ADD VALUE is safe; existing rows are unaffected.

ALTER TYPE "Regime" ADD VALUE IF NOT EXISTS 'CHOP';
ALTER TYPE "Regime" ADD VALUE IF NOT EXISTS 'TRANSITION';

-- Rename WITH_TREND→WITH and COUNTER→COUNTER is not safe in-place.
-- Instead, add the alias values used in the schema. Legacy WITH_TREND / COUNTER remain.
ALTER TYPE "Alignment" ADD VALUE IF NOT EXISTS 'WITH';
ALTER TYPE "Alignment" ADD VALUE IF NOT EXISTS 'NEUTRAL';

ALTER TYPE "SetupType" ADD VALUE IF NOT EXISTS 'VWAP_PULLBACK';
ALTER TYPE "SetupType" ADD VALUE IF NOT EXISTS 'ORB_BREAK';
ALTER TYPE "SetupType" ADD VALUE IF NOT EXISTS 'SWEEP_FAIL';
ALTER TYPE "SetupType" ADD VALUE IF NOT EXISTS 'RANGE_RECLAIM';
ALTER TYPE "SetupType" ADD VALUE IF NOT EXISTS 'RANGE_REJECT';


-- ── 3. TradeSetup — Layer 1 structured intent fields ─────────────────────────

ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "triggerType"     "TriggerType";
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "entryPrice"      FLOAT;
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "stopPrice"       FLOAT;
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "targetPrice"     FLOAT;


-- ── 4. TradeSetup — Layer 2 per-trade market reality fields ──────────────────

ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "trueRegime"      "Regime";
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "vwapState"       "VWAPState";
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "structure"       "StructureType";
-- alignment on TradeSetup (trade-relative; distinct from the removed DayContext.alignment)
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "alignment"       "Alignment";


-- ── 5. TradeSetup — Layer 3 reflection fields ────────────────────────────────

ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "mistakeTags"     "MistakeTag"[] NOT NULL DEFAULT '{}';
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "executionScore"  INT;
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "readScore"       INT;
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "disciplineScore" INT;
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "bestSetupType"   "SetupType";
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "bestDirection"   "Direction";
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "shouldTrade"     BOOLEAN;


-- ── 6. TradeSetup — analytics indexes ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "TradeSetup_setupDate_setupType_idx"
  ON "TradeSetup"("setupDate", "setupType");

CREATE INDEX IF NOT EXISTS "TradeSetup_trueRegime_vwapState_idx"
  ON "TradeSetup"("trueRegime", "vwapState");

CREATE INDEX IF NOT EXISTS "TradeSetup_alignment_shouldTrade_idx"
  ON "TradeSetup"("alignment", "shouldTrade");


-- ── 7. DayContext — add dayType; remove alignment ────────────────────────────

ALTER TABLE "DayContext" ADD COLUMN IF NOT EXISTS "dayType" "DayType";

-- Backfill dayType from the legacy marketContext string where the mapping is clear.
UPDATE "DayContext" SET "dayType" = 'TREND'
  WHERE "marketContext" IN ('uptrend', 'downtrend', 'trending') AND "dayType" IS NULL;
UPDATE "DayContext" SET "dayType" = 'RANGE'
  WHERE "marketContext" = 'range' AND "dayType" IS NULL;
UPDATE "DayContext" SET "dayType" = 'CHOP'
  WHERE "marketContext" IN ('choppy', 'chop') AND "dayType" IS NULL;

-- alignment is no longer day-wide; it moves to TradeSetup.
-- The column is dropped here. Run the normalization script first if you need to
-- migrate per-date alignment values into individual TradeSetup rows.
ALTER TABLE "DayContext" DROP COLUMN IF EXISTS "alignment";


-- ── 8. Create MarketOpportunity table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "MarketOpportunity" (
  "id"            TEXT             NOT NULL,
  "symbol"        TEXT             NOT NULL,
  "date"          TIMESTAMP(3)     NOT NULL,
  "trueRegime"    "Regime"         NOT NULL,
  "vwapState"     "VWAPState"      NOT NULL,
  "dayType"       "DayType"        NOT NULL,
  "structure"     "StructureType"  NOT NULL,
  "setupType"     "SetupType"      NOT NULL,
  "triggerType"   "TriggerType",
  "direction"     "Direction"      NOT NULL,
  "alignment"     "Alignment",
  "outcome"       "OutcomeType",
  "maxFavorable"  FLOAT,
  "maxAdverse"    FLOAT,
  "taken"         BOOLEAN          NOT NULL DEFAULT false,
  "missReason"    "MissReason",
  "notes"         TEXT,
  "qualityScore"  INT,
  "isAPlus"       BOOLEAN,
  "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketOpportunity_symbol_date_idx"
  ON "MarketOpportunity"("symbol", "date");

CREATE INDEX IF NOT EXISTS "MarketOpportunity_setupType_trueRegime_idx"
  ON "MarketOpportunity"("setupType", "trueRegime");

CREATE INDEX IF NOT EXISTS "MarketOpportunity_taken_missReason_idx"
  ON "MarketOpportunity"("taken", "missReason");
