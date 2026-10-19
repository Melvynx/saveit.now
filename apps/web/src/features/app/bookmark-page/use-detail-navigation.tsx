"use client";

import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { BookmarkDetailMode } from "./bookmark-detail-utils";

/**
 * Links to another bookmark's detail in the same surface: full page stays a
 * page, the library panel swaps in place (masked as /app/b/:id), and the
 * agents panel swaps `?b=`.
 */
export function BookmarkDetailLink({
  bookmarkId,
  mode,
  className,
  children,
}: {
  bookmarkId: string;
  mode: BookmarkDetailMode;
  className?: string;
  children: ReactNode;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });

  if (mode === "page") {
    return (
      <Link
        to="/app/b/$bookmarkId"
        params={{ bookmarkId }}
        className={className}
      >
        {children}
      </Link>
    );
  }

  if (pathname === "/app/agents") {
    return (
      <Link
        to="/app/agents"
        search={(previous) => ({ ...previous, b: bookmarkId }) as never}
        replace
        resetScroll={false}
        className={className}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to="/app"
      search={(previous) => ({ ...previous, bookmarkId }) as never}
      mask={{
        to: "/app/b/$bookmarkId",
        params: { bookmarkId },
        unmaskOnReload: true,
      }}
      replace
      resetScroll={false}
      className={className}
    >
      {children}
    </Link>
  );
}

function getLibraryOrder() {
  const links = document.querySelectorAll<HTMLAnchorElement>(
    '#app-main a[href^="/app/b/"]',
  );
  const ids: string[] = [];
  const elements = new Map<string, HTMLAnchorElement>();
  for (const link of links) {
    const id = link.getAttribute("href")?.slice("/app/b/".length);
    if (!id || elements.has(id)) continue;
    ids.push(id);
    elements.set(id, link);
  }
  return { ids, elements };
}

/**
 * J / K step through the library grid behind the side panel. The order is
 * read from the rendered card links, so it always matches what is on screen.
 */
export function useLibraryStepper({
  bookmarkId,
  enabled,
}: {
  bookmarkId: string;
  enabled: boolean;
}) {
  const navigate = useNavigate();

  const step = (delta: 1 | -1) => {
    const { ids, elements } = getLibraryOrder();
    const index = ids.indexOf(bookmarkId);
    if (index === -1) return;
    const nextId = ids[index + delta];
    if (!nextId) return;
    elements.get(nextId)?.scrollIntoView({ block: "nearest" });
    void navigate({
      to: "/app",
      search: (previous) => ({ ...previous, bookmarkId: nextId }) as never,
      mask: {
        to: "/app/b/$bookmarkId",
        params: { bookmarkId: nextId },
        unmaskOnReload: true,
      },
      replace: true,
      resetScroll: false,
    });
  };

  useHotkeys("j", () => step(1), { enabled }, [bookmarkId]);
  useHotkeys("k", () => step(-1), { enabled }, [bookmarkId]);

  return step;
}
