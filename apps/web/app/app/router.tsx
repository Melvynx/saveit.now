"use client";

import { BookmarkPage } from "app/app/bookmark-page/bookmark-page";
import { BrowserRouter, Route, Routes } from "react-router";
import { useEffect, useState } from "react";
import { BookmarksPage } from "./bookmarks-page";

export function Router() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render router during SSR to avoid context errors
  if (!isClient) {
    return <BookmarksPage />;
  }

  return (
    <BrowserRouter>
      <BookmarksPage />
      <Routes>
        <Route path="/app/b/:id" element={<BookmarkPage />} />
      </Routes>
    </BrowserRouter>
  );
}
