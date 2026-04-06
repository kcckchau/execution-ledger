-- CreateEnum
CREATE TYPE "Context" AS ENUM ('TREND', 'RANGE', 'TRANSITION', 'ABOVE_VWAP', 'BELOW_VWAP');

-- CreateEnum
CREATE TYPE "Location" AS ENUM ('RANGE_HIGH', 'RANGE_LOW', 'MID_RANGE', 'PDH', 'PDL', 'PREMARKET_HIGH', 'PREMARKET_LOW', 'AH_HIGH', 'AH_LOW', 'VWAP', 'WHOLE_NUMBER');

-- CreateEnum
CREATE TYPE "EntryTrigger" AS ENUM ('EMA9_21_BULLISH_CROSS', 'EMA9_21_BEARISH_CROSS', 'BREAK_STRUCTURE', 'REJECTION_CANDLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SetupType" ADD VALUE 'FAILED_BREAKOUT';
ALTER TYPE "SetupType" ADD VALUE 'FAILED_BREAKDOWN';

-- AlterTable
ALTER TABLE "DayContext" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MarketOpportunity" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TradeSetup" ADD COLUMN     "contexts" "Context"[] DEFAULT ARRAY[]::"Context"[],
ADD COLUMN     "entryTrigger" "EntryTrigger",
ADD COLUMN     "locations" "Location"[] DEFAULT ARRAY[]::"Location"[],
ALTER COLUMN "setupType" SET DEFAULT 'RANGE';

-- CreateIndex
CREATE INDEX "MarketOpportunity_date_idx" ON "MarketOpportunity"("date");

-- CreateIndex
CREATE INDEX "TradeSetup_entryTrigger_idx" ON "TradeSetup"("entryTrigger");
