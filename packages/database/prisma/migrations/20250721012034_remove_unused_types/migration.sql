/*
  Warnings:

  - The values [VIDEO,BLOG,POST] on the enum `BookmarkType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BookmarkType_new" AS ENUM ('ARTICLE', 'PAGE', 'IMAGE', 'YOUTUBE', 'TWEET', 'PDF');
ALTER TABLE "Bookmark" ALTER COLUMN "type" TYPE "BookmarkType_new" USING ("type"::text::"BookmarkType_new");
ALTER TYPE "BookmarkType" RENAME TO "BookmarkType_old";
ALTER TYPE "BookmarkType_new" RENAME TO "BookmarkType";
DROP TYPE "BookmarkType_old";
COMMIT;
