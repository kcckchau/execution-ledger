-- Drop OpportunityExecution table if it was created by untracked migrations
DROP TABLE IF EXISTS "OpportunityExecution";

-- Drop MarketOpportunity table
DROP TABLE IF EXISTS "MarketOpportunity";

-- Add isIdeal flag to TradeSetup
ALTER TABLE "TradeSetup" ADD COLUMN "isIdeal" BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering by date + isIdeal (used in calendar and drill-down queries)
CREATE INDEX "TradeSetup_setupDate_isIdeal_idx" ON "TradeSetup"("setupDate", "isIdeal");
