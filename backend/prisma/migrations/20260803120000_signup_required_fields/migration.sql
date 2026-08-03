-- Sign-up now collects a fuller, mandatory profile.
--
-- 1. Birthday as day + month only. The platform sends birthday wishes and has
--    no use for the year, so it is deliberately never collected.
-- 2. DegreeType loses PHD and DIPLOMA — ADCET awards B.E./B.Tech and
--    M.E./M.Tech only. Any stray rows are nulled before the type is swapped so
--    the cast cannot fail.
-- 3. Emails are canonicalised to lowercase so one address can only ever back
--    one account. A functional unique index enforces it at the database level,
--    which the application-level check alone could not do under a race.

-- 1. Birthday ------------------------------------------------------------
ALTER TABLE "Profile" ADD COLUMN "birthDay" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "birthMonth" INTEGER;

-- 2. DegreeType ----------------------------------------------------------
UPDATE "Profile" SET "degree" = NULL WHERE "degree" IN ('PHD', 'DIPLOMA');

CREATE TYPE "DegreeType_new" AS ENUM ('BE', 'ME');
ALTER TABLE "Profile"
  ALTER COLUMN "degree" TYPE "DegreeType_new"
  USING ("degree"::text::"DegreeType_new");
DROP TYPE "DegreeType";
ALTER TYPE "DegreeType_new" RENAME TO "DegreeType";

-- 3. Email canonicalisation ---------------------------------------------
-- Fold case first. If two accounts differ only by case this UPDATE trips the
-- existing unique constraint and the migration aborts — the right outcome:
-- silently merging or dropping someone's account would be worse.
UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");

-- Belt and braces: the column is already UNIQUE, but a functional index keeps
-- it unique even if a future code path reintroduces mixed case.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));
