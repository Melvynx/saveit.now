import { create } from "zustand";

type LibrarySelection = {
  selectedIds: ReadonlySet<string>;
  /** Last id toggled without shift; start of a shift+click range. */
  anchorId: string | null;
  /** Card the keyboard cursor is on. */
  focusedId: string | null;
  /** True after keyboard navigation; the focus ring only shows then. */
  keyboardMode: boolean;
  /** Ids in display order, for ranges and J/K. */
  orderedIds: readonly string[];
  toggle: (id: string) => void;
  selectRange: (id: string) => void;
  clear: () => void;
  setFocused: (id: string | null, options?: { keyboard?: boolean }) => void;
  setKeyboardMode: (keyboardMode: boolean) => void;
  setOrderedIds: (ids: readonly string[]) => void;
};

export const useLibrarySelection = create<LibrarySelection>((set, get) => ({
  selectedIds: new Set(),
  anchorId: null,
  focusedId: null,
  keyboardMode: false,
  orderedIds: [],
  toggle: (id) => {
    const next = new Set(get().selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedIds: next, anchorId: id });
  },
  selectRange: (id) => {
    const { anchorId, selectedIds, orderedIds } = get();
    const from = anchorId ? orderedIds.indexOf(anchorId) : -1;
    const to = orderedIds.indexOf(id);
    if (from === -1 || to === -1) {
      get().toggle(id);
      return;
    }
    const next = new Set(selectedIds);
    const [start, end] = from < to ? [from, to] : [to, from];
    for (const rangeId of orderedIds.slice(start, end + 1)) next.add(rangeId);
    set({ selectedIds: next, anchorId: id });
  },
  clear: () => set({ selectedIds: new Set(), anchorId: null }),
  setFocused: (focusedId, options) =>
    set({
      focusedId,
      keyboardMode: options?.keyboard ?? get().keyboardMode,
    }),
  setKeyboardMode: (keyboardMode) => {
    if (get().keyboardMode !== keyboardMode) set({ keyboardMode });
  },
  setOrderedIds: (orderedIds) => {
    const { selectedIds, focusedId } = get();
    const visible = new Set(orderedIds);
    const keptSelection = [...selectedIds].filter((id) => visible.has(id));
    set({
      orderedIds,
      focusedId: focusedId && visible.has(focusedId) ? focusedId : null,
      ...(keptSelection.length !== selectedIds.size
        ? { selectedIds: new Set(keptSelection) }
        : {}),
    });
  },
}));

export const useIsSelected = (id: string) =>
  useLibrarySelection((state) => state.selectedIds.has(id));

export const useShowsFocusRing = (id: string) =>
  useLibrarySelection(
    (state) => state.keyboardMode && state.focusedId === id,
  );

export const useSelectionCount = () =>
  useLibrarySelection((state) => state.selectedIds.size);
