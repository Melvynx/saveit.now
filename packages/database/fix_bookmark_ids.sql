-- Fix bookmark IDs that are not in ULID format
-- This script will replace invalid bookmark IDs with proper ULIDs

-- Create a function to generate ULID-like IDs
CREATE OR REPLACE FUNCTION generate_ulid() RETURNS TEXT AS $$
DECLARE
    timestamp_part TEXT;
    random_part TEXT;
    ulid_alphabet TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    i INTEGER;
    current_ms BIGINT;
    char_index INTEGER;
BEGIN
    -- Get current timestamp in milliseconds since epoch
    current_ms := EXTRACT(EPOCH FROM NOW() AT TIME ZONE 'UTC') * 1000;
    
    -- Convert timestamp to base32 (simplified version)
    timestamp_part := '';
    FOR i IN 1..10 LOOP
        char_index := (current_ms % 32)::INTEGER + 1;
        timestamp_part := SUBSTRING(ulid_alphabet FROM char_index FOR 1) || timestamp_part;
        current_ms := current_ms / 32;
    END LOOP;
    
    -- Generate 16 random characters
    random_part := '';
    FOR i IN 1..16 LOOP
        char_index := FLOOR(RANDOM() * 32)::INTEGER + 1;
        random_part := random_part || SUBSTRING(ulid_alphabet FROM char_index FOR 1);
    END LOOP;
    
    RETURN timestamp_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- Create temporary table to store ID mappings
CREATE TEMP TABLE bookmark_id_mapping (
    old_id TEXT,
    new_id TEXT
);

-- Find bookmarks with invalid ULID format
-- Valid ULID: 26 characters, using Crockford's Base32
INSERT INTO bookmark_id_mapping (old_id, new_id)
SELECT 
    id as old_id,
    generate_ulid() as new_id
FROM "Bookmark"
WHERE 
    LENGTH(id) != 26 
    OR id !~ '^[0-9A-HJKMNP-TV-Z]{26}$';

-- Show how many bookmarks will be updated
SELECT COUNT(*) as bookmarks_to_update FROM bookmark_id_mapping;

-- Update foreign key references first (to avoid constraint violations)

-- Update BookmarkTag references
UPDATE "BookmarkTag" 
SET "bookmarkId" = m.new_id
FROM bookmark_id_mapping m
WHERE "BookmarkTag"."bookmarkId" = m.old_id;

-- Update BookmarkChunk references  
UPDATE "BookmarkChunk"
SET "bookmarkId" = m.new_id
FROM bookmark_id_mapping m
WHERE "BookmarkChunk"."bookmarkId" = m.old_id;

-- Update BookmarkOpen references
UPDATE "BookmarkOpen"
SET "bookmarkId" = m.new_id
FROM bookmark_id_mapping m
WHERE "BookmarkOpen"."bookmarkId" = m.old_id;

-- Finally, update the Bookmark table itself
UPDATE "Bookmark"
SET id = m.new_id
FROM bookmark_id_mapping m
WHERE "Bookmark".id = m.old_id;

-- Show the results
SELECT 
    'BookmarkTag' as table_name,
    COUNT(*) as updated_records
FROM "BookmarkTag" bt
WHERE EXISTS (
    SELECT 1 FROM bookmark_id_mapping m WHERE bt."bookmarkId" = m.new_id
)
UNION ALL
SELECT 
    'BookmarkChunk' as table_name,
    COUNT(*) as updated_records
FROM "BookmarkChunk" bc
WHERE EXISTS (
    SELECT 1 FROM bookmark_id_mapping m WHERE bc."bookmarkId" = m.new_id
)
UNION ALL
SELECT 
    'BookmarkOpen' as table_name,
    COUNT(*) as updated_records
FROM "BookmarkOpen" bo
WHERE EXISTS (
    SELECT 1 FROM bookmark_id_mapping m WHERE bo."bookmarkId" = m.new_id
)
UNION ALL
SELECT 
    'Bookmark' as table_name,
    COUNT(*) as updated_records
FROM "Bookmark" b
WHERE EXISTS (
    SELECT 1 FROM bookmark_id_mapping m WHERE b.id = m.new_id
);

-- Clean up the temporary function
DROP FUNCTION generate_ulid();

-- Show a message
SELECT 'Bookmark ID migration completed successfully' as status;