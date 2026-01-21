-- AlterTable
ALTER TABLE "user" ADD COLUMN "publicLinkEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "publicLinkSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_publicLinkSlug_key" ON "user"("publicLinkSlug");
