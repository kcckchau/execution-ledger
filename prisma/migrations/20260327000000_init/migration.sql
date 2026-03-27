-- CreateTable
CREATE TABLE "TradeSetup" (
    "id" TEXT NOT NULL,
    "setupDate" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "marketContext" TEXT NOT NULL,
    "setupType" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "invalidation" TEXT NOT NULL,
    "decisionTarget" TEXT NOT NULL,
    "riskEntry" TEXT NOT NULL,
    "riskStop" TEXT NOT NULL,
    "riskTarget" TEXT NOT NULL,
    "initialGrade" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "overallNotes" TEXT NOT NULL DEFAULT '',
    "review" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "size" INTEGER NOT NULL,
    "executionTime" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_setupId_fkey"
    FOREIGN KEY ("setupId") REFERENCES "TradeSetup"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
