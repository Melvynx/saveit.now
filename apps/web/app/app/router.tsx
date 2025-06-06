"use client";

import { BookmarkPage } from "app/app/bookmark-page/bookmark-page";
import { BrowserRouter, Route, Routes } from "react-router";
import { BookmarksPage } from "./bookmarks-page";

export function Router() {
  return (
    <BrowserRouter>
      <BookmarksPage />
      <Routes>
        <Route path="/app/b/:id" element={<BookmarkPage />} />
      </Routes>
    </BrowserRouter>
  );
}
