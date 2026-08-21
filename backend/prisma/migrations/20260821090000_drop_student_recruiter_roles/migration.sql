-- Drop the STUDENT and RECRUITER roles.
--
-- The portal only ever had two kinds of account in practice — alumni and the
-- alumni office — and every feature is written for those two. Keeping two
-- unused values in the enum meant `/auth/register` had to accept a `role` from
-- the request body to choose between them, which is exactly the kind of
-- client-supplied privilege input this migration exists to remove.
--
-- Order matters: rows must stop referencing the two values before the enum
-- type can be recreated without them.

-- 1. Anyone still carrying STUDENT or RECRUITER becomes a plain ALUMNI. The
--    NOT EXISTS guard keeps the @@unique([userId, role]) constraint happy for
--    users who already hold ALUMNI as well.
UPDATE "UserRole" u
   SET "role" = 'ALUMNI'
 WHERE u."role" IN ('STUDENT', 'RECRUITER')
   AND NOT EXISTS (
     SELECT 1 FROM "UserRole" other
      WHERE other."userId" = u."userId"
        AND other."role" = 'ALUMNI'
   );

-- 2. Whatever is left is a duplicate of an ALUMNI row that already exists.
DELETE FROM "UserRole" WHERE "role" IN ('STUDENT', 'RECRUITER');

-- 3. Recreate the enum with only the two surviving values. Postgres has no
--    "DROP VALUE", so the type is swapped out from under the column.
ALTER TYPE "AppRole" RENAME TO "AppRole_old";
CREATE TYPE "AppRole" AS ENUM ('ALUMNI', 'ADMIN');
ALTER TABLE "UserRole"
  ALTER COLUMN "role" TYPE "AppRole" USING ("role"::text::"AppRole");
DROP TYPE "AppRole_old";
