-- CreateEnum
CREATE TYPE "EmailRsvpStatus" AS ENUM ('YES', 'NO', 'NOT_SURE', 'MAYBE');

-- AlterTable: Event
ALTER TABLE "Event" ADD COLUMN "attachmentKey" TEXT,
ADD COLUMN "department" TEXT;

-- AlterTable: EventRsvp
ALTER TABLE "EventRsvp" ADD COLUMN "emailRsvpStatus" "EmailRsvpStatus";

-- AlterTable: Job
ALTER TABLE "Job" ADD COLUMN "attachmentKey" TEXT,
ADD COLUMN "department" TEXT;

-- AlterTable: UserPreferences
ALTER TABLE "UserPreferences" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'default';
