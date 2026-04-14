-- Extend enums for the new canonical setup model.
ALTER TYPE "SetupType" ADD VALUE IF NOT EXISTS 'TREND_PULLBACK';
ALTER TYPE "SetupType" ADD VALUE IF NOT EXISTS 'FAILED_MOVE';
ALTER TYPE "SetupType" ADD VALUE IF NOT EXISTS 'VWAP_PLAY';

DO $$
BEGIN
  CREATE TYPE "Trigger" AS ENUM (
    'RECLAIM_LEVEL',
    'BREAK_AND_HOLD',
    'STRONG_ENGULF',
    'MOMENTUM_SHIFT',
    'LIQUIDITY_SWEEP',
    'FAILURE_CONFIRM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TradeLocation" AS ENUM (
    'ABOVE_VWAP',
    'BELOW_VWAP',
    'AT_VWAP'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LiquidityContext" AS ENUM (
    'SWEEP_HIGH',
    'SWEEP_LOW',
    'NONE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KeyLevel" AS ENUM (
    'PDH',
    'PDL',
    'PREMARKET_HIGH',
    'PREMARKET_LOW',
    'RANGE_HIGH',
    'RANGE_LOW',
    'VWAP',
    'WHOLE_NUMBER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "EntryType" AS ENUM (
    'AGGRESSIVE',
    'PULLBACK'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "EntryTiming" AS ENUM (
    'EARLY',
    'IDEAL',
    'LATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "Confirmation" AS ENUM (
    'HOLD_ABOVE_LEVEL',
    'HOLD_BELOW_LEVEL',
    'FOLLOW_THROUGH'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TradeSetup"
  ADD COLUMN IF NOT EXISTS "triggers" "Trigger"[] DEFAULT ARRAY[]::"Trigger"[],
  ADD COLUMN IF NOT EXISTS "dayType" "DayType",
  ADD COLUMN IF NOT EXISTS "location" "TradeLocation",
  ADD COLUMN IF NOT EXISTS "liquidityContext" "LiquidityContext",
  ADD COLUMN IF NOT EXISTS "keyLevels" "KeyLevel"[] DEFAULT ARRAY[]::"KeyLevel"[],
  ADD COLUMN IF NOT EXISTS "entryType" "EntryType",
  ADD COLUMN IF NOT EXISTS "entryTiming" "EntryTiming",
  ADD COLUMN IF NOT EXISTS "confirmation" "Confirmation"[] DEFAULT ARRAY[]::"Confirmation"[];
