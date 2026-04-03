-- Map existing free-text setupType values to the new enum members before altering the column.
UPDATE "TradeSetup" SET "setupType" =
  CASE
    WHEN "setupType" ILIKE '%reclaim%'   THEN 'VWAP_RECLAIM'
    WHEN "setupType" ILIKE '%reject%'    THEN 'VWAP_REJECT'
    WHEN "setupType" ILIKE '%breakdown%' THEN 'BREAKDOWN'
    WHEN "setupType" ILIKE '%breakout%'  THEN 'BREAKOUT'
    WHEN "setupType" ILIKE '%orb%'       THEN 'BREAKOUT'
    WHEN "setupType" ILIKE '%range%'     THEN 'RANGE'
    WHEN "setupType" ILIKE '%fade%'      THEN 'RANGE'
    ELSE 'RANGE'
  END;

-- Create enum types
CREATE TYPE "SetupType" AS ENUM ('VWAP_RECLAIM', 'VWAP_REJECT', 'BREAKOUT', 'BREAKDOWN', 'RANGE', 'FLIP');
CREATE TYPE "Regime"    AS ENUM ('UP', 'DOWN', 'RANGE');
CREATE TYPE "Transition" AS ENUM ('NONE', 'FLIP', 'FAILED_FLIP');
CREATE TYPE "Alignment" AS ENUM ('WITH_TREND', 'COUNTER');

-- Change setupType column to use the new enum
ALTER TABLE "TradeSetup"
  ALTER COLUMN "setupType" TYPE "SetupType" USING "setupType"::"SetupType";

-- Add nullable classification columns
ALTER TABLE "TradeSetup" ADD COLUMN "initialRegime" "Regime";
ALTER TABLE "TradeSetup" ADD COLUMN "entryRegime"   "Regime";
ALTER TABLE "TradeSetup" ADD COLUMN "transition"    "Transition";
ALTER TABLE "TradeSetup" ADD COLUMN "alignment"     "Alignment";
