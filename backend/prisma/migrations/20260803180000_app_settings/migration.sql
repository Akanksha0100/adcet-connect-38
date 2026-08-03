-- Admin-tunable application settings, one row per key.
--
-- Sparse by design: a row exists only once an admin overrides the default, so
-- `lib/settings.ts` stays the source of truth for defaults and a missing row is
-- the normal case rather than an error. Values are JSON-encoded text, parsed
-- back through each key's Zod schema on read.

CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- Keep the audit trail if the admin who last changed a setting is deleted.
ALTER TABLE "AppSetting"
  ADD CONSTRAINT "AppSetting_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
