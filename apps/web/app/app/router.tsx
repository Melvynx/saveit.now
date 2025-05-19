"use client";

import { BookmarkPage } from "app/app/bookmark-page/bookmark-page";
import { BrowserRouter, Route, Routes } from "react-router";
import { BookmarksPage } from "./bookmarks-page";
import { ImportPage } from "./imports/imports-page";

export function Router() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/app" element={<BookmarksPage />} />
          <Route path="/imports" element={<ImportPage />} />
        </Routes>
      </BrowserRouter>
      <BookmarkPage />
    </>
  );
}
