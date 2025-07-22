-- Convert deprecated BookmarkType values to PAGE
-- VIDEO, BLOG, and POST types are deprecated and will be processed as PAGE

-- Update existing bookmarks with deprecated types to PAGE
UPDATE "Bookmark" 
SET "type" = 'PAGE' 
WHERE "type" IN ('VIDEO', 'BLOG', 'POST');