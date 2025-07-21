-- CreateEnum
CREATE TYPE "BookmarkProcessingRunStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "BookmarkProcessingRun" (
    "id" TEXT NOT NULL,
    "inngestRunId" TEXT NOT NULL,
    "bookmarkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BookmarkProcessingRunStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "BookmarkProcessingRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkProcessingRun_inngestRunId_key" ON "BookmarkProcessingRun"("inngestRunId");

-- CreateIndex
CREATE INDEX "BookmarkProcessingRun_userId_startedAt_idx" ON "BookmarkProcessingRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "BookmarkProcessingRun_inngestRunId_idx" ON "BookmarkProcessingRun"("inngestRunId");

-- AddForeignKey
ALTER TABLE "BookmarkProcessingRun" ADD CONSTRAINT "BookmarkProcessingRun_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "Bookmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkProcessingRun" ADD CONSTRAINT "BookmarkProcessingRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;