import { create } from "zustand";

export type SavedBookmark = { id: string; url: string };

type SavedBookmarkTray = {
  /** The bookmark that was just saved from the library, if any. */
  saved: (SavedBookmark & { key: number }) | null;
  announce: (saved: SavedBookmark) => void;
  dismiss: () => void;
};

/**
 * Drives the "Saved, add tags" tray. Quick add, paste-to-save and the
 * URL-in-search card all announce here instead of firing a success toast.
 */
export const useSavedBookmarkTray = create<SavedBookmarkTray>((set, get) => ({
  saved: null,
  announce: (saved) =>
    set({ saved: { ...saved, key: (get().saved?.key ?? 0) + 1 } }),
  dismiss: () => set({ saved: null }),
}));
