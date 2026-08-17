-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 100;

-- CreateIndex
CREATE INDEX "Chapter_sortOrder_idx" ON "Chapter"("sortOrder");

-- Position the seeded chapters in the order the alumni office asked for:
-- Pune, Mumbai, Bangalore, Global. Anything an admin created later keeps the
-- default 100 and sorts after these, alphabetically among themselves.
UPDATE "Chapter" SET "sortOrder" = 1 WHERE "slug" = 'pune';
UPDATE "Chapter" SET "sortOrder" = 2 WHERE "slug" = 'mumbai';
UPDATE "Chapter" SET "sortOrder" = 3 WHERE "slug" = 'bangalore';

-- The Global chapter, for alumni outside the three regional hubs. Seeded here
-- rather than in seed.ts because that script is development-only; a deployed
-- server only ever runs migrations plus seed-admin.ts.
--
-- `city` is deliberately NULL: "Global" is not a place, and the chapter card
-- hides its location line when there is none. ON CONFLICT keeps this migration
-- safe on a database where an admin already created the slug by hand.
INSERT INTO "Chapter" ("id", "slug", "name", "blurb", "accent", "city", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'global',
  'Global Chapter',
  'ADCET alumni working and studying outside India — from the Gulf and Europe to North America, Australia and East Asia — keeping the network reachable across time zones.',
  'from-indigo-500 to-violet-400',
  NULL,
  true,
  4,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET "sortOrder" = 4;
