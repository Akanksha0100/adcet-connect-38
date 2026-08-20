-- CreateEnum
CREATE TYPE "CollaborationType" AS ENUM ('PLACEMENT', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "CollaborationMode" AS ENUM ('ON_CAMPUS', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('HOURS', 'DAYS');

-- CreateTable
CREATE TABLE "CollaborationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CollaborationType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "departments" TEXT[],
    "mode" "CollaborationMode",
    "description" TEXT,
    "attachmentKey" TEXT,
    "attachmentName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "candidatesRequired" INTEGER,
    "jobRole" TEXT,
    "packageLpa" DOUBLE PRECISION,
    "driveDate" TIMESTAMP(3),
    "eligibility" TEXT,
    "subject" TEXT,
    "durationValue" INTEGER,
    "durationUnit" "DurationUnit",
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "expectedParticipants" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollaborationRequest_type_status_createdAt_idx" ON "CollaborationRequest"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CollaborationRequest_userId_createdAt_idx" ON "CollaborationRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CollaborationRequest" ADD CONSTRAINT "CollaborationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborationRequest" ADD CONSTRAINT "CollaborationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
