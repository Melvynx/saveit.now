import { createGetBookmarkTool } from "./get-bookmark";
import { createSearchBookmarksTool } from "./search-bookmarks";
import { createShowBookmarkTool } from "./show-bookmark";
import { createShowBookmarksTool } from "./show-bookmarks";
import { createUpdateTagsTool } from "./update-tags";

export const createBookmarkTools = (userId: string) => ({
  searchBookmarks: createSearchBookmarksTool(userId),
  getBookmark: createGetBookmarkTool(userId),
  showBookmarks: createShowBookmarksTool(userId),
  showBookmark: createShowBookmarkTool(userId),
  updateTags: createUpdateTagsTool(userId),
});

export type BookmarkTools = ReturnType<typeof createBookmarkTools>;
