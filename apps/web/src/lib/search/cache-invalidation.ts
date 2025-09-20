import { SearchCache } from './search-cache';
import type { Bookmark } from '@workspace/database';

export class CacheInvalidation {
  /**
   * Invalidate search cache when bookmark is created
   */
  static async onBookmarkCreated(bookmark: Bookmark): Promise<void> {
    await SearchCache.invalidateUserSearches(bookmark.userId);
  }

  /**
   * Invalidate search cache when bookmark is updated
   */
  static async onBookmarkUpdated(bookmark: Bookmark): Promise<void> {
    await SearchCache.invalidateBookmarkUpdate(bookmark.userId);
  }

  /**
   * Invalidate search cache when bookmark is deleted
   */
  static async onBookmarkDeleted(userId: string): Promise<void> {
    await SearchCache.invalidateBookmarkUpdate(userId);
  }

  /**
   * Invalidate search cache when tags are updated
   */
  static async onBookmarkTagsUpdated(userId: string): Promise<void> {
    await SearchCache.invalidateUserSearches(userId);
  }

  /**
   * Invalidate search cache when bookmark status changes
   */
  static async onBookmarkStatusChanged(bookmark: Bookmark): Promise<void> {
    // Only invalidate if status changed to/from COMPLETE
    await SearchCache.invalidateUserSearches(bookmark.userId);
  }
}