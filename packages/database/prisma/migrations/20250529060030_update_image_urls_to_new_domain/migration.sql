-- Update preview URLs that start with pub-aff269310b204ddda85b9fe4bfa9de93.r2.dev to use the new custom domain
UPDATE "Bookmark" 
SET "preview" = REPLACE("preview", 'https://pub-aff269310b204ddda85b9fe4bfa9de93.r2.dev', 'https://saveit.mlvcdn.com')
WHERE "preview" LIKE 'https://pub-aff269310b204ddda85b9fe4bfa9de93.r2.dev%';

-- Update faviconUrl URLs that start with pub-aff269310b204ddda85b9fe4bfa9de93.r2.dev to use the new custom domain  
UPDATE "Bookmark"
SET "faviconUrl" = REPLACE("faviconUrl", 'https://pub-aff269310b204ddda85b9fe4bfa9de93.r2.dev', 'https://saveit.mlvcdn.com')
WHERE "faviconUrl" LIKE 'https://pub-aff269310b204ddda85b9fe4bfa9de93.r2.dev%';

-- Update ogImageUrl URLs that start with pub-aff269310b204ddda85b9fe4bfa9de93.r2.dev to use the new custom domain
UPDATE "Bookmark"
SET "ogImageUrl" = REPLACE("ogImageUrl", 'https://pub-aff269310b204ddda85b9fe4bfa9de93.r2.dev', 'https://saveit.mlvcdn.com')
WHERE "ogImageUrl" LIKE 'https://pub-aff269310b204ddda85b9fe4bfa9de93.r2.dev%';