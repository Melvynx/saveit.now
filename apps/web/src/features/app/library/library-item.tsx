import { cn } from "@workspace/ui/lib/utils";
import { Check } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import {
  useIsSelected,
  useLibrarySelection,
  useSelectionCount,
  useShowsFocusRing,
} from "./selection-store";

const isFromControl = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(
    target.closest(
      "[data-slot=bookmark-card-actions],[data-slot=library-select],[role=menu],[role=dialog]",
    ),
  );

/**
 * Click / shift+click / focus wiring shared by grid cards and list rows.
 * While a selection exists, a plain click toggles instead of opening.
 */
export function useLibraryItemInteractions(id: string) {
  const selectionActive = useSelectionCount() > 0;
  const toggle = useLibrarySelection((state) => state.toggle);
  const selectRange = useLibrarySelection((state) => state.selectRange);
  const setFocused = useLibrarySelection((state) => state.setFocused);

  const onClickCapture = (event: MouseEvent) => {
    if (isFromControl(event.target)) return;
    if (event.metaKey || event.ctrlKey || event.button !== 0) return;
    if (event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      selectRange(id);
      return;
    }
    if (selectionActive) {
      event.preventDefault();
      event.stopPropagation();
      toggle(id);
    }
  };

  return {
    selectionActive,
    onClickCapture,
    // Shift+click must not start a text selection.
    onMouseDown: (event: MouseEvent) => {
      if (event.shiftKey) event.preventDefault();
    },
    onPointerDown: () => setFocused(id, { keyboard: false }),
    onFocus: () => setFocused(id),
  };
}

export function SelectCheckbox({
  id,
  label,
  className,
  forceVisible,
}: {
  id: string;
  label: string;
  className?: string;
  forceVisible?: boolean;
}) {
  const selected = useIsSelected(id);
  const toggle = useLibrarySelection((state) => state.toggle);
  const selectRange = useLibrarySelection((state) => state.selectRange);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Select ${label}`}
      data-slot="library-select"
      onMouseDown={(event) => {
        if (event.shiftKey) event.preventDefault();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) selectRange(id);
        else toggle(id);
      }}
      className={cn(
        "flex size-5 items-center justify-center rounded-md text-primary-foreground ring-1 transition-[opacity,background-color,box-shadow] duration-150 ease-(--ease-out-soft) outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-primary ring-primary opacity-100"
          : "bg-background/90 ring-foreground/20 backdrop-blur-md hover:ring-foreground/40",
        selected || forceVisible
          ? "opacity-100"
          : "opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 group-data-focused/item:opacity-100 [@media(pointer:coarse)]:opacity-100",
        className,
      )}
    >
      <Check
        className={cn("size-3.5 stroke-3", selected ? "opacity-100" : "opacity-0")}
        aria-hidden
      />
    </button>
  );
}

/** Masonry cell: selection checkbox, focus ring and selected tint around a card. */
export function LibraryGridItem({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const selected = useIsSelected(id);
  const focused = useShowsFocusRing(id);
  const interactions = useLibraryItemInteractions(id);

  return (
    <div
      data-bookmark-id={id}
      data-focused={focused || undefined}
      data-selected={selected || undefined}
      onClickCapture={interactions.onClickCapture}
      onMouseDown={interactions.onMouseDown}
      onPointerDown={interactions.onPointerDown}
      onFocus={interactions.onFocus}
      className={cn(
        "group/item relative scroll-mt-40 rounded-xl animate-rise-in md:scroll-mt-32",
        "after:pointer-events-none after:absolute after:-inset-1 after:rounded-[16px] after:ring-2 after:ring-transparent after:transition-[box-shadow] after:duration-150",
        focused && "after:ring-primary",
        selected &&
          "after:ring-primary/70 [&_[data-slot=card]]:ring-primary/40",
        interactions.selectionActive && "cursor-pointer",
      )}
    >
      {children}
      <SelectCheckbox
        id={id}
        label={label}
        forceVisible={interactions.selectionActive}
        className="absolute top-2.5 left-2.5 z-30"
      />
      {selected ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-primary/6"
        />
      ) : null}
    </div>
  );
}
