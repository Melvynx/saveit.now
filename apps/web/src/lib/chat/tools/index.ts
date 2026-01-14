import { createGetBookmarkTool } from "./get-bookmark";
import { createSearchBookmarksTool } from "./search-bookmarks";
import { showBookmarkToolDefinition } from "./show-bookmark";
import { showBookmarksToolDefinition } from "./show-bookmarks";

export const createBookmarkTools = (userId: string) => ({
  searchBookmarks: createSearchBookmarksTool(userId),
  getBookmark: createGetBookmarkTool(userId),
  showBookmarks: showBookmarksToolDefinition,
  showBookmark: showBookmarkToolDefinition,
});

export type BookmarkTools = ReturnType<typeof createBookmarkTools>;
