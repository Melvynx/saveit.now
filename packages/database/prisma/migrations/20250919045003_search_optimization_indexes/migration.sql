-- CreateIndex
CREATE INDEX "idx_bookmark_user_filters" ON "public"."Bookmark"("userId", "type", "starred", "read", "status");

-- CreateIndex
CREATE INDEX "idx_bookmark_user_created" ON "public"."Bookmark"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_bookmark_starred" ON "public"."Bookmark"("userId", "starred", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_bookmark_unread" ON "public"."Bookmark"("userId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_bookmark_tag_bookmark" ON "public"."BookmarkTag"("bookmarkId", "tagId");
