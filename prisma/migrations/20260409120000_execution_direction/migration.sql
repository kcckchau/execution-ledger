ALTER TABLE "Execution"
ADD COLUMN "direction" TEXT;

UPDATE "Execution" e
SET "direction" = ts."direction"
FROM "TradeSetup" ts
WHERE ts."id" = e."setupId"
  AND e."direction" IS NULL;

ALTER TABLE "Execution"
ALTER COLUMN "direction" SET NOT NULL;
