-- Lift day-level classification fields out of TradeSetup into a new DayContext table.
-- One DayContext row per unique setupDate; existing data is migrated.

-- 1. Handle the setupName column that may or may not exist yet (applied in a prior migration).
ALTER TABLE "TradeSetup" ADD COLUMN IF NOT EXISTS "setupName" TEXT;

-- 2. Create the DayContext table.
CREATE TABLE "DayContext" (
  "id"            TEXT        NOT NULL,
  "date"          TEXT        NOT NULL,
  "marketContext" TEXT,
  "initialRegime" "Regime",
  "entryRegime"   "Regime",
  "transition"    "Transition",
  "alignment"     "Alignment",
  "notes"         TEXT        NOT NULL DEFAULT '',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DayContext_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DayContext_date_key" ON "DayContext"("date");

-- 3. Migrate: one DayContext per unique setupDate.
--    Take the first non-null value for each field, ordered by createdAt.
INSERT INTO "DayContext" (
  "id", "date", "marketContext",
  "initialRegime", "entryRegime", "transition", "alignment",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  ts."setupDate",
  MIN(ts."marketContext"),
  (array_agg(ts."initialRegime" ORDER BY ts."createdAt") FILTER (WHERE ts."initialRegime" IS NOT NULL))[1],
  (array_agg(ts."entryRegime"   ORDER BY ts."createdAt") FILTER (WHERE ts."entryRegime"   IS NOT NULL))[1],
  (array_agg(ts."transition"    ORDER BY ts."createdAt") FILTER (WHERE ts."transition"    IS NOT NULL))[1],
  (array_agg(ts."alignment"     ORDER BY ts."createdAt") FILTER (WHERE ts."alignment"     IS NOT NULL))[1],
  NOW(),
  NOW()
FROM "TradeSetup" ts
GROUP BY ts."setupDate"
ON CONFLICT ("date") DO NOTHING;

-- 4. Drop the migrated columns from TradeSetup.
ALTER TABLE "TradeSetup" DROP COLUMN IF EXISTS "marketContext";
ALTER TABLE "TradeSetup" DROP COLUMN IF EXISTS "initialRegime";
ALTER TABLE "TradeSetup" DROP COLUMN IF EXISTS "entryRegime";
ALTER TABLE "TradeSetup" DROP COLUMN IF EXISTS "transition";
ALTER TABLE "TradeSetup" DROP COLUMN IF EXISTS "alignment";
