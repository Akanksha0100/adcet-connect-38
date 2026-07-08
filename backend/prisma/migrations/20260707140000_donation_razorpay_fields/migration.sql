-- Razorpay payment tracking + donor snapshot for donations
ALTER TABLE "Donation" ADD COLUMN "donorName" TEXT;
ALTER TABLE "Donation" ADD COLUMN "donorEmail" TEXT;
ALTER TABLE "Donation" ADD COLUMN "provider" TEXT DEFAULT 'razorpay';
ALTER TABLE "Donation" ADD COLUMN "razorpayOrderId" TEXT;
ALTER TABLE "Donation" ADD COLUMN "razorpayPaymentId" TEXT;
ALTER TABLE "Donation" ADD COLUMN "razorpaySignature" TEXT;
ALTER TABLE "Donation" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Donation" ADD COLUMN "receiptNo" TEXT;
ALTER TABLE "Donation" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Donation" ADD COLUMN "receiptSentAt" TIMESTAMP(3);

-- Unique constraints
CREATE UNIQUE INDEX "Donation_razorpayOrderId_key" ON "Donation"("razorpayOrderId");
CREATE UNIQUE INDEX "Donation_receiptNo_key" ON "Donation"("receiptNo");

-- Lookup index for reconciliation by payment id
CREATE INDEX "Donation_razorpayPaymentId_idx" ON "Donation"("razorpayPaymentId");
