import { useEffect, useRef } from "react";
import type { BookmarkCardData } from "../bookmark-card/bookmark.types";
import { isTypingTarget } from "../shell/shortcuts";
import { useLibraryPreferences } from "./library-preferences";
import { useLibrarySelection } from "./selection-store";
import { useBookmarkActions } from "./use-bookmark-actions";

type Direction = "up" | "down" | "left" | "right";

const itemElement = (id: string) =>
  document.querySelector<HTMLElement>(
    `[data-bookmark-id="${CSS.escape(id)}"]`,
  );

/** Nearest item from `from` in a direction, by on-screen geometry. */
function findNeighbor(fromId: string, direction: Direction, ids: readonly string[]) {
  const from = itemElement(fromId)?.getBoundingClientRect();
  if (!from) return null;
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;
  let best: { id: string; score: number } | null = null;

  for (const id of ids) {
    if (id === fromId) continue;
    const rect = itemElement(id)?.getBoundingClientRect();
    if (!rect) continue;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const dx = x - fx;
    const dy = y - fy;
    const sameColumn = Math.abs(dx) < from.width / 2;
    const sameRowBand = rect.bottom > from.top && rect.top < from.bottom;

    let score: number | null = null;
    if (direction === "down" && dy > 1 && sameColumn) score = dy;
    if (direction === "up" && dy < -1 && sameColumn) score = -dy;
    if (direction === "right" && dx > 1 && sameRowBand) score = dx + Math.abs(dy) * 2;
    if (direction === "left" && dx < -1 && sameRowBand) score = -dx + Math.abs(dy) * 2;
    if (score !== null && (!best || score < best.score)) best = { id, score };
  }
  return best?.id ?? null;
}

function firstVisibleId(ids: readonly string[]) {
  const header = document.querySelector("[data-slot=page-header]");
  const top = header ? header.getBoundingClientRect().bottom : 0;
  return (
    ids.find((id) => {
      const rect = itemElement(id)?.getBoundingClientRect();
      return rect ? rect.bottom > top + 8 : false;
    }) ?? ids[0] ?? null
  );
}

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowDown: "down",
  ArrowUp: "up",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * Library hotkeys: J/K and arrows move the focus ring, Enter opens, O opens
 * the original, S stars, C copies, X selects, Esc clears, V cycles the view.
 */
export function useLibraryKeyboard({
  bookmarks,
  enabled,
}: {
  bookmarks: BookmarkCardData[];
  enabled: boolean;
}) {
  const actions = useBookmarkActions();
  const bookmarksRef = useRef(bookmarks);
  const actionsRef = useRef(actions);

  useEffect(() => {
    bookmarksRef.current = bookmarks;
    actionsRef.current = actions;
  });

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = () =>
      useLibrarySelection.getState().setKeyboardMode(false);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector("[role=dialog],[role=menu],[role=listbox]")) {
        return;
      }

      const state = useLibrarySelection.getState();
      const ids = state.orderedIds;
      const key = event.key;
      const lower = key.length === 1 ? key.toLowerCase() : key;

      const moveTo = (id: string | null) => {
        if (!id) return;
        event.preventDefault();
        state.setFocused(id, { keyboard: true });
        itemElement(id)?.scrollIntoView({ block: "nearest" });
      };

      if (lower === "v" && !event.shiftKey) {
        event.preventDefault();
        useLibraryPreferences.getState().cycleView();
        return;
      }

      if (key === "Escape") {
        if (state.selectedIds.size > 0) {
          event.preventDefault();
          state.clear();
        } else if (state.focusedId) {
          state.setFocused(null, { keyboard: false });
        }
        return;
      }

      if (ids.length === 0) return;
      const focusedId =
        state.focusedId && ids.includes(state.focusedId) ? state.focusedId : null;

      if (lower === "j" || lower === "k") {
        if (!focusedId || !state.keyboardMode) {
          moveTo(focusedId ?? firstVisibleId(ids));
          return;
        }
        const index = ids.indexOf(focusedId);
        const next = lower === "j" ? index + 1 : index - 1;
        moveTo(ids[Math.min(ids.length - 1, Math.max(0, next))] ?? null);
        return;
      }

      const direction = KEY_DIRECTIONS[key];
      if (direction) {
        if (!focusedId || !state.keyboardMode) return;
        moveTo(findNeighbor(focusedId, direction, ids));
        return;
      }

      if (!focusedId) return;
      const bookmark = bookmarksRef.current.find((item) => item.id === focusedId);
      if (!bookmark) return;

      if (key === "Enter") {
        event.preventDefault();
        itemElement(focusedId)
          ?.querySelector<HTMLAnchorElement>("[data-card-link]")
          ?.click();
        return;
      }
      if (lower === "x") {
        event.preventDefault();
        if (event.shiftKey) state.selectRange(focusedId);
        else state.toggle(focusedId);
        return;
      }
      if (event.shiftKey) return;
      if (lower === "o") {
        event.preventDefault();
        actionsRef.current.openOriginal(bookmark.url);
        return;
      }
      if (lower === "s") {
        event.preventDefault();
        void actionsRef.current.setStarred(bookmark.id, !bookmark.starred);
        return;
      }
      if (lower === "c") {
        event.preventDefault();
        actionsRef.current.copyLink(bookmark.url, { toast: true });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
    };
  }, [enabled]);
}
