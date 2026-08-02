-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "chapterId" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "chapterId" TEXT;

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blurb" TEXT,
    "accent" TEXT,
    "city" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_slug_key" ON "Chapter"("slug");

-- CreateIndex
CREATE INDEX "Chapter_isActive_idx" ON "Chapter"("isActive");

-- CreateIndex
CREATE INDEX "Event_chapterId_idx" ON "Event"("chapterId");

-- CreateIndex
CREATE INDEX "Profile_chapterId_idx" ON "Profile"("chapterId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
