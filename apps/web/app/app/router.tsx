"use client";

import { BookmarkPage } from "app/app/bookmark-page/bookmark-page";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { BookmarksPage } from "./bookmarks-page";
import { ChatPage } from "./chat/chat-page";

function AppContent() {
  const location = useLocation();
  const isChatPage = location.pathname === "/app/chat";

  return (
    <>
      {isChatPage ? <ChatPage /> : <BookmarksPage />}
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
