-- CreateTable
CREATE TABLE "ChartMarker" (
    "id"             TEXT         NOT NULL,
    "symbol"         TEXT         NOT NULL,
    "tradeDate"      TEXT         NOT NULL,
    "executionTime"  TIMESTAMP(3) NOT NULL,
    "side"           TEXT         NOT NULL,
    "shares"         DOUBLE PRECISION NOT NULL,
    "price"          DOUBLE PRECISION NOT NULL,
    "executionType"  TEXT         NOT NULL,
    "positionEffect" TEXT         NOT NULL,
    "source"         TEXT         NOT NULL DEFAULT 'ibkr',
    "externalId"     TEXT         NOT NULL,
    "markerShape"    TEXT         NOT NULL,
    "markerColor"    TEXT         NOT NULL,
    "markerText"     TEXT         NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChartMarker_symbol_tradeDate_externalId_key"
    ON "ChartMarker"("symbol", "tradeDate", "externalId");

-- CreateIndex
CREATE INDEX "ChartMarker_symbol_tradeDate_idx"
    ON "ChartMarker"("symbol", "tradeDate");
