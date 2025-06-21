-- CreateTable
CREATE TABLE "BookmarkOpen" (
    "id" TEXT NOT NULL,
    "bookmarkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookmarkOpen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookmarkOpen_bookmarkId_userId_idx" ON "BookmarkOpen"("bookmarkId", "userId");

-- CreateIndex
CREATE INDEX "BookmarkOpen_userId_openedAt_idx" ON "BookmarkOpen"("userId", "openedAt");

-- AddForeignKey
ALTER TABLE "BookmarkOpen" ADD CONSTRAINT "BookmarkOpen_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "Bookmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkOpen" ADD CONSTRAINT "BookmarkOpen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
