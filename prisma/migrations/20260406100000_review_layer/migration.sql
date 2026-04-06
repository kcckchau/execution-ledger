-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN');

-- CreateEnum
CREATE TYPE "SetupResult" AS ENUM ('PLAYED_OUT', 'FAILED', 'UNCLEAR');

-- CreateEnum
CREATE TYPE "MistakeType" AS ENUM ('BAD_SETUP', 'WRONG_CONTEXT', 'BAD_LOCATION', 'EARLY_ENTRY', 'LATE_ENTRY', 'NO_TRIGGER', 'WRONG_STOP', 'NO_PLAN', 'EMOTIONAL');

-- CreateEnum
CREATE TYPE "MarketOutcome" AS ENUM ('VWAP_RECLAIM', 'VWAP_REJECT', 'TREND_CONTINUATION', 'RANGE_CONTINUATION', 'REVERSAL');

-- AlterTable: add optional review layer columns
ALTER TABLE "TradeSetup" ADD COLUMN "outcome"       "Outcome";
ALTER TABLE "TradeSetup" ADD COLUMN "setupResult"   "SetupResult";
ALTER TABLE "TradeSetup" ADD COLUMN "mistakeTypes"  "MistakeType"[] NOT NULL DEFAULT ARRAY[]::"MistakeType"[];
ALTER TABLE "TradeSetup" ADD COLUMN "marketOutcome" "MarketOutcome";
ALTER TABLE "TradeSetup" ADD COLUMN "reviewNote"    TEXT;

-- CreateIndex
CREATE INDEX "TradeSetup_outcome_setupResult_idx" ON "TradeSetup"("outcome", "setupResult");
