-- Track feed-post usage in its own increment-only counter.
--
-- Previously the monthly quota counted rows in "Post", which handed the slot
-- back whenever a post was deleted — so the cap could be side-stepped by
-- posting and deleting in a loop. A published post must spend its slot for the
-- month even if it is removed a minute later, which only a separate counter
-- can express.

CREATE TABLE "PostQuotaUsage" (
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostQuotaUsage_pkey" PRIMARY KEY ("userId", "period")
);

ALTER TABLE "PostQuotaUsage"
  ADD CONSTRAINT "PostQuotaUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed from the posts that still exist, so switching over doesn't hand
-- everyone a fresh allowance. Posts already deleted before this migration are
-- unrecoverable and simply aren't counted — a one-time under-count in users'
-- favour, which is the safe direction to be wrong in.
--
-- `createdAt` is stored in UTC, so a post made within a few hours of a month
-- boundary may land in the neighbouring period. Immaterial for a one-off
-- backfill; every count from here on is written by the application.
INSERT INTO "PostQuotaUsage" ("userId", "period", "count", "updatedAt")
SELECT "authorId", to_char("createdAt", 'YYYY-MM'), COUNT(*), NOW()
  FROM "Post"
 GROUP BY "authorId", to_char("createdAt", 'YYYY-MM');
