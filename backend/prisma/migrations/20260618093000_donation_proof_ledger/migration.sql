-- Donation payment proof and audit ledger.
ALTER TABLE "Donation" ADD COLUMN "proofKey" TEXT;

CREATE TABLE "DonationLedgerEntry" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "actorId" TEXT,
    "entryType" TEXT NOT NULL,
    "status" "DonationStatus",
    "amount" INTEGER,
    "proofKey" TEXT,
    "receiptKey" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Donation_status_createdAt_idx" ON "Donation"("status", "createdAt");
CREATE INDEX "DonationLedgerEntry_donationId_createdAt_idx" ON "DonationLedgerEntry"("donationId", "createdAt");
CREATE INDEX "DonationLedgerEntry_actorId_idx" ON "DonationLedgerEntry"("actorId");
CREATE INDEX "DonationLedgerEntry_entryType_createdAt_idx" ON "DonationLedgerEntry"("entryType", "createdAt");

ALTER TABLE "DonationLedgerEntry" ADD CONSTRAINT "DonationLedgerEntry_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DonationLedgerEntry" ADD CONSTRAINT "DonationLedgerEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
