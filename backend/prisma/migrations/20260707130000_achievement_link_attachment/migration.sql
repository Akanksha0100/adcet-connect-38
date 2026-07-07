-- Add supporting-document and external-link fields to achievements
ALTER TABLE "Achievement" ADD COLUMN "attachmentKey" TEXT;
ALTER TABLE "Achievement" ADD COLUMN "link" TEXT;
