-- Events and jobs can now target several departments at once, so the single
-- nullable `department` column becomes a `departments` array.
--
-- Semantics carry over: what used to be NULL (or the sentinel 'All' the old
-- event form submitted) is now an EMPTY array, and both mean "everyone".
-- Anything else becomes a one-element array that later edits can extend.

-- Events ----------------------------------------------------------------
ALTER TABLE "Event" ADD COLUMN "departments" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "Event"
   SET "departments" = ARRAY["department"]
 WHERE "department" IS NOT NULL
   AND "department" <> 'All';

ALTER TABLE "Event" DROP COLUMN "department";

-- Jobs ------------------------------------------------------------------
ALTER TABLE "Job" ADD COLUMN "departments" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "Job"
   SET "departments" = ARRAY["department"]
 WHERE "department" IS NOT NULL
   AND "department" <> 'All';

ALTER TABLE "Job" DROP COLUMN "department";
