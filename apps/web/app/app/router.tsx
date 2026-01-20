"use client";

import { BookmarkPage } from "app/app/bookmark-page/bookmark-page";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { AgentsPage } from "./agents/chat-page";
import { BookmarksPage } from "./bookmarks-page";

function AppContent() {
  const location = useLocation();
  const state = location.state as { from?: string } | null;

  const isAgentsPage =
    state?.from === "agents" || location.pathname === "/app/agents";

  return (
    <>
      {isAgentsPage ? <AgentsPage /> : <BookmarksPage />}
      <Routes>
        <Route path="/app/b/:id" element={<BookmarkPage />} />
      </Routes>
    </>
  );
}

export function Router() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
