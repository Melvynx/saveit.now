"use client";

import { BookmarkPage } from "app/app/bookmark-page/bookmark-page";
import { BookmarksPage } from "./bookmarks-page";

export function Router() {
  return (
    <>
      <BookmarksPage />
      <BookmarkPage />
    </>
  );
}
