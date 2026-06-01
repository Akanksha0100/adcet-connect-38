-- AlterTable: Job — closable applications
ALTER TABLE "Job" ADD COLUMN "isClosed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "closedAt" TIMESTAMP(3);

-- AlterTable: JobApplication — resume retention tracking
ALTER TABLE "JobApplication" ADD COLUMN "resumeDeletedAt" TIMESTAMP(3);

-- AlterTable: Event — online meeting URL
ALTER TABLE "Event" ADD COLUMN "meetingUrl" TEXT;