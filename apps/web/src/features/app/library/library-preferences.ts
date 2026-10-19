import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LibraryView = "grid" | "list" | "compact";
export type LibrarySort = "newest" | "oldest";

export const LIBRARY_VIEWS: readonly LibraryView[] = ["grid", "list", "compact"];

type LibraryPreferences = {
  view: LibraryView;
  sort: LibrarySort;
  setView: (view: LibraryView) => void;
  cycleView: () => void;
  setSort: (sort: LibrarySort) => void;
};

export const useLibraryPreferences = create<LibraryPreferences>()(
  persist(
    (set, get) => ({
      view: "grid",
      sort: "newest",
      setView: (view) => set({ view }),
      cycleView: () => {
        const index = LIBRARY_VIEWS.indexOf(get().view);
        set({ view: LIBRARY_VIEWS[(index + 1) % LIBRARY_VIEWS.length] });
      },
      setSort: (sort) => set({ sort }),
    }),
    {
      name: "saveit:library-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ view: state.view, sort: state.sort }),
    },
  ),
);
