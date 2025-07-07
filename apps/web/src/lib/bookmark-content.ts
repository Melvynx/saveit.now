/**
 * Utilities for extracting content from bookmark metadata
 * 
 * Expected metadata structure for articles:
 * {
 *   markdown: string  // Markdown content for the article
 *   // ... other metadata fields
 * }
 */

type BookmarkMetadata = {
  markdown?: string;
  [key: string]: unknown;
} | null | undefined;

// Also accept Prisma's JsonValue type
type PrismaJsonValue = string | number | boolean | object | null;

/**
 * Extracts markdown content from bookmark metadata
 * Only checks the 'markdown' field as specified
 */
export function getMarkdownContent(metadata: BookmarkMetadata | PrismaJsonValue): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  
  if ('markdown' in metadata && metadata.markdown && typeof metadata.markdown === 'string') {
    return metadata.markdown;
  }
  
  return null;
}

/**
 * Checks if bookmark has markdown content available for reading
 */
export function hasMarkdownContent(metadata: BookmarkMetadata | PrismaJsonValue): boolean {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }
  
  return !!('markdown' in metadata && metadata.markdown && typeof metadata.markdown === 'string' && metadata.markdown.trim());
}