-- AlterEnum
-- Remove unused BLOG and POST values from BookmarkType enum

-- Create a new enum type with only the values we want to keep
CREATE TYPE "BookmarkType_new" AS ENUM ('VIDEO', 'ARTICLE', 'PAGE', 'IMAGE', 'YOUTUBE', 'TWEET', 'PDF', 'PRODUCT');

-- Update the Bookmark table to use the new enum type
ALTER TABLE "Bookmark" ALTER COLUMN "type" TYPE "BookmarkType_new" USING ("type"::text::"BookmarkType_new");

-- Drop the old enum type
DROP TYPE "BookmarkType";

-- Rename the new enum type to the original name
ALTER TYPE "BookmarkType_new" RENAME TO "BookmarkType";