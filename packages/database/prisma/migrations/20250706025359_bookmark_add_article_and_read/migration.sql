-- AlterEnum
ALTER TYPE "BookmarkType" ADD VALUE 'ARTICLE';

-- AlterTable
ALTER TABLE "Bookmark" ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false;
