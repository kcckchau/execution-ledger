-- CreateEnum
CREATE TYPE "InvalidationType" AS ENUM ('RECLAIM_VWAP', 'BREAK_RANGE_HIGH', 'BREAK_RANGE_LOW', 'HOLD_ABOVE_VWAP', 'HOLD_BELOW_VWAP', 'STRUCTURE_BREAK');

-- Add new columns with safe defaults
ALTER TABLE "TradeSetup" ADD COLUMN "invalidationType" "InvalidationType" NOT NULL DEFAULT 'STRUCTURE_BREAK';
ALTER TABLE "TradeSetup" ADD COLUMN "invalidationNote" TEXT;

-- Migrate existing invalidation text into invalidationNote (preserve all data)
UPDATE "TradeSetup"
SET "invalidationNote" = "invalidation"
WHERE "invalidation" IS NOT NULL AND "invalidation" <> '';

-- Drop the old free-text invalidation column
ALTER TABLE "TradeSetup" DROP COLUMN "invalidation";
