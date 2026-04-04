-- Optional human-readable name for a TradeSetup.
-- Used as the display label in the session chart's setup toggle UI.
-- Falls back to setupType + instance index when NULL.
ALTER TABLE "TradeSetup" ADD COLUMN "setupName" TEXT;
