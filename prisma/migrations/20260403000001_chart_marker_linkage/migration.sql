-- Add explicit linkage columns to ChartMarker.
-- executionId and setupId replace the previous minute+price approximate matching
-- that was used in /api/chart-data to correlate markers with TradeSetup records.

ALTER TABLE "ChartMarker" ADD COLUMN "executionId" TEXT;
ALTER TABLE "ChartMarker" ADD COLUMN "setupId" TEXT;

-- Backfill executionId for all existing records.
-- Deterministic rule: Execution.id = 'exec-' || ChartMarker.id  (since ChartMarker.id = externalId).
-- Only link when the Execution actually exists to avoid dangling references.
UPDATE "ChartMarker" cm
SET "executionId" = 'exec-' || cm.id
WHERE EXISTS (
  SELECT 1 FROM "Execution" e WHERE e.id = 'exec-' || cm.id
);

-- Backfill setupId from the matched Execution.
UPDATE "ChartMarker" cm
SET "setupId" = e."setupId"
FROM "Execution" e
WHERE e.id = cm."executionId"
  AND cm."executionId" IS NOT NULL;

CREATE INDEX "ChartMarker_setupId_idx" ON "ChartMarker"("setupId");
