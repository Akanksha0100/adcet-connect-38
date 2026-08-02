-- CreateEnum
CREATE TYPE "ChapterInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ChapterInvitation" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ChapterInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ChapterInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChapterInvitation_userId_status_idx" ON "ChapterInvitation"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterInvitation_chapterId_userId_key" ON "ChapterInvitation"("chapterId", "userId");

-- AddForeignKey
ALTER TABLE "ChapterInvitation" ADD CONSTRAINT "ChapterInvitation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterInvitation" ADD CONSTRAINT "ChapterInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterInvitation" ADD CONSTRAINT "ChapterInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
