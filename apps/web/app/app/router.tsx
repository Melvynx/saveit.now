"use client";

import { BookmarkPage } from "app/app/bookmark-page/bookmark-page";
import { usePathname } from "next/navigation";
import { BookmarksPage } from "./bookmarks-page";

export function Router() {
  const pathname = usePathname();
  const isBookmarkPage = pathname?.startsWith('/app/b/');

  return (
    <>
      <BookmarksPage />
      {isBookmarkPage && <BookmarkPage />}
    </>
  );
}
