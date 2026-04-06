-- Drop legacy JSON review blob (replaced by structured review layer + reviewNote).
ALTER TABLE "TradeSetup" DROP COLUMN IF EXISTS "review";
