"use client";

import { BookmarksPage } from "./bookmarks-page";

export function Router() {
  // Simplified router without BrowserRouter to avoid SSR context issues
  // The bookmark detail page functionality can be handled through Next.js routing
  return <BookmarksPage />;
}
