import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useDebounce } from "@/hooks/use-debounce";
import { getErrorMessage } from "@/lib/errors";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Kbd } from "@workspace/ui/components/kbd";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation } from "convex/react";
import { Check, Hash, Plus, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getDomain } from "../bookmark-card/bookmark-card-parts";
import { isTypingTarget } from "../shell/shortcuts";
import { FADE, FADE_FAST, SPRING_LAYOUT, SPRING_SNAPPY } from "./motion";
import { type SavedBookmark, useSavedBookmarkTray } from "./saved-bookmark-store";

const SUGGESTION_COUNT = 5;
const SEARCH_LIMIT = 8;
const MAX_TAG_LENGTH = 48;
/** Untouched, the tray leaves on its own; after a tap it lingers a little. */
const IDLE_DISMISS_MS = 8000;
const TOUCHED_DISMISS_MS = 5000;

type TagRow = { id: string; name: string };

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const cleanName = (value: string) =>
  value.trim().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);

function TagChip({
  name,
  selected,
  create,
  onToggle,
}: {
  name: string;
  selected: boolean;
  /** "Create #name" chip shown for a name that matches no existing tag. */
  create?: boolean;
  onToggle: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      layout={reduceMotion ? false : "position"}
      type="button"
      aria-pressed={create ? undefined : selected}
      aria-label={create ? `Create tag ${name}` : `Tag ${name}`}
      data-testid="post-save-tag-chip"
      data-selected={selected || undefined}
      onClick={onToggle}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: FADE_FAST }
          : { opacity: 0, scale: 0.9, transition: FADE_FAST }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.95 }}
      transition={{ layout: SPRING_LAYOUT, opacity: FADE, scale: SPRING_SNAPPY }}
      className={cn(
        "relative inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap outline-none select-none",
        "transition-colors duration-150 ease-(--ease-out-soft) focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-foreground",
        // 44px tall hit area on touch without a taller chip.
        "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-background/12 text-background/85 hover:bg-background/20 hover:text-background",
      )}
    >
      {create ? (
        <Plus className="size-3 shrink-0 opacity-70" aria-hidden />
      ) : (
        <Hash className="size-3 shrink-0 opacity-60" aria-hidden />
      )}
      <span className="max-w-40 truncate">{name}</span>
    </motion.button>
  );
}

function TrayContent({
  saved,
  onDismiss,
}: {
  saved: SavedBookmark;
  onDismiss: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const updateTags = useMutation(api.tags.mutations.updateBookmarkTags);
  const topTags = useAuthedQuery(api.tags.queries.topManualTags, {
    limit: SUGGESTION_COUNT,
  });
  // Freeze the suggestions: every tap bumps a use count, and the row must
  // not reorder under the pointer.
  const [suggestions, setSuggestions] = useState<TagRow[] | undefined>(topTags);
  if (suggestions === undefined && topTags !== undefined) {
    setSuggestions(topTags);
  }

  const [selected, setSelected] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [touched, setTouched] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const typed = cleanName(query);
  const debouncedTyped = useDebounce(typed, 120);
  const searchResult = useAuthedQuery(
    api.tags.queries.legacySearch,
    searchOpen && debouncedTyped
      ? { query: debouncedTyped, limit: SEARCH_LIMIT }
      : "skip",
  ) as { page?: TagRow[] } | undefined;
  // Keep the last matches on screen while the next ones load.
  const [matches, setMatches] = useState<TagRow[]>([]);
  if (searchResult?.page && searchResult.page !== matches) {
    setMatches(searchResult.page);
  }

  const isSelected = (name: string) =>
    selected.some((item) => sameName(item, name));

  const toggle = (rawName: string) => {
    const name = cleanName(rawName);
    if (!name) return;
    const wasSelected = selectedRef.current.some((item) => sameName(item, name));
    const apply = (list: string[], add: boolean) =>
      add
        ? list.some((item) => sameName(item, name))
          ? list
          : [...list, name]
        : list.filter((item) => !sameName(item, name));

    setSelected((list) => apply(list, !wasSelected));
    setTouched((count) => count + 1);
    const bookmarkId = saved.id as Id<"bookmarks">;
    void updateTags(
      wasSelected
        ? { bookmarkId, add: [], remove: [name] }
        : { bookmarkId, add: [name] },
    ).catch((error: unknown) => {
      setSelected((list) => apply(list, wasSelected));
      toast.error(getErrorMessage(error, "Couldn't update tags"));
    });
  };

  const openSearch = () => {
    setSearchOpen(true);
    // Focus synchronously so mobile keyboards open on the same tap.
    inputRef.current?.focus({ preventScroll: true });
  };

  const closeSearch = ({ restoreFocus }: { restoreFocus: boolean }) => {
    setSearchOpen(false);
    setQuery("");
    if (restoreFocus) addButtonRef.current?.focus({ preventScroll: true });
  };

  const searching = searchOpen && typed !== "";
  const chips = useMemo(() => {
    if (searching) {
      const needle = typed.toLowerCase();
      const filtered = matches
        .filter((tag) => tag.name.toLowerCase().includes(needle))
        .sort(
          (a, b) =>
            Number(b.name.toLowerCase().startsWith(needle)) -
            Number(a.name.toLowerCase().startsWith(needle)),
        );
      const exact = filtered.some((tag) => sameName(tag.name, typed));
      // Matches first so Enter picks an existing tag before creating one.
      return [
        ...filtered.map((tag) => ({
          key: `tag:${tag.name.toLowerCase()}`,
          name: tag.name,
          create: false,
        })),
        ...(exact
          ? []
          : [{ key: `create:${typed.toLowerCase()}`, name: typed, create: true }]),
      ];
    }
    const base = suggestions ?? [];
    const extras = selected.filter(
      (name) => !base.some((tag) => sameName(tag.name, name)),
    );
    return [...extras, ...base.map((tag) => tag.name)].map((name) => ({
      key: `tag:${name.toLowerCase()}`,
      name,
      create: false,
    }));
  }, [matches, searching, selected, suggestions, typed]);

  // Auto-dismiss, paused while the pointer or focus is on the tray.
  const paused = hovered || focusWithin || searchOpen;
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(
      onDismiss,
      touched > 0 ? TOUCHED_DISMISS_MS : IDLE_DISMISS_MS,
    );
    return () => clearTimeout(timer);
  }, [paused, touched, onDismiss]);

  // "T" jumps into the tag field while the tray is up.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "t") return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector("[role=dialog],[role=menu],[role=listbox]")) {
        return;
      }
      event.preventDefault();
      setSearchOpen(true);
      inputRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const domain = getDomain(saved.url);
  const appliedCount = selected.length;

  return (
    <div
      className="flex h-9 w-full min-w-0 items-center"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
    >
      <p
        role="status"
        className="flex h-9 min-w-0 shrink-0 items-center gap-2 pr-2 pl-2 text-[13px] font-semibold sm:pr-3"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3 stroke-3" aria-hidden />
        </span>
        <span className="hidden sm:inline">Saved</span>
        <span className="hidden max-w-36 truncate font-normal text-background/60 sm:inline">
          {domain}
        </span>
        <span className="sr-only">
          <span className="sm:hidden">Saved</span>
          {appliedCount > 0
            ? `, ${appliedCount} ${appliedCount === 1 ? "tag" : "tags"} added`
            : ". Add tags below."}
        </span>
      </p>
      <span className="h-4 w-px shrink-0 bg-background/15" aria-hidden />

      <div
        role="group"
        aria-label="Add tags to the saved bookmark"
        className="flex h-full min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overflow-y-hidden px-2 no-scrollbar mask-[linear-gradient(to_right,transparent,black_0.5rem,black_calc(100%-1.5rem),transparent)]"
      >
        <motion.div
          initial={false}
          animate={{ width: searchOpen ? 168 : 28 }}
          transition={reduceMotion ? { duration: 0 } : SPRING_SNAPPY}
          className={cn(
            "relative flex h-7 shrink-0 items-center overflow-hidden rounded-full transition-[background-color,box-shadow] duration-150 ease-(--ease-out-soft)",
            searchOpen
              ? "bg-background/12 ring-1 ring-background/25 focus-within:ring-2 focus-within:ring-primary"
              : "bg-background/12 hover:bg-background/20",
          )}
        >
          <button
            ref={addButtonRef}
            type="button"
            aria-label="Search or create a tag"
            aria-keyshortcuts="T"
            aria-expanded={searchOpen}
            data-testid="post-save-tag-add"
            tabIndex={searchOpen ? -1 : 0}
            onClick={openSearch}
            className={cn(
              "absolute inset-y-0 left-0 flex w-7 items-center justify-center rounded-full text-background/85 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
              "before:absolute before:-inset-1 before:content-['']",
              searchOpen && "pointer-events-none",
            )}
          >
            <Plus
              className={cn(
                "size-3.5 transition-[rotate,opacity] duration-200 ease-(--ease-out-soft)",
                searchOpen && "rotate-90 opacity-0",
              )}
              aria-hidden
            />
            <Hash
              className={cn(
                "absolute size-3.5 transition-[rotate,opacity] duration-200 ease-(--ease-out-soft)",
                searchOpen ? "opacity-60" : "-rotate-90 opacity-0",
              )}
              aria-hidden
            />
          </button>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const first = chips[0];
                if (searching && first) {
                  toggle(first.name);
                  setQuery("");
                } else if (!typed) {
                  closeSearch({ restoreFocus: true });
                }
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                if (query) setQuery("");
                else closeSearch({ restoreFocus: true });
              }
            }}
            onBlur={() => {
              if (!query.trim()) closeSearch({ restoreFocus: false });
            }}
            placeholder="Find or create tag"
            aria-label="Find or create a tag"
            aria-hidden={!searchOpen}
            tabIndex={searchOpen ? 0 : -1}
            maxLength={MAX_TAG_LENGTH + 1}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
            data-testid="post-save-tag-input"
            className={cn(
              "h-full w-[168px] shrink-0 bg-transparent pr-2.5 pl-7 text-[13px] text-background outline-none placeholder:text-background/50 transition-opacity duration-150",
              searchOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />
        </motion.div>

        <AnimatePresence initial={false} mode="popLayout">
          {chips.map((chip) => (
            <TagChip
              key={chip.key}
              name={chip.name}
              create={chip.create}
              selected={!chip.create && isSelected(chip.name)}
              onToggle={() => {
                toggle(chip.name);
                if (searching) {
                  setQuery("");
                  inputRef.current?.focus({ preventScroll: true });
                }
              }}
            />
          ))}
        </AnimatePresence>
        {!searchOpen && chips.length === 0 && suggestions !== undefined ? (
          <span className="text-[13px] whitespace-nowrap text-background/55">
            Add a tag
          </span>
        ) : null}
      </div>

      <Kbd
        aria-hidden
        className={cn(
          "mr-1 hidden bg-background/12 text-background/70 ring-background/15 transition-opacity duration-150 md:inline-flex",
          searchOpen && "opacity-0",
        )}
      >
        T
      </Kbd>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="relative flex size-8 shrink-0 items-center justify-center rounded-full text-background/70 transition-colors outline-none before:absolute before:-inset-1.5 before:content-[''] hover:bg-background/12 hover:text-background focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Bottom-center tray shown right after a save from the library: confirms the
 * save and offers the user's most-used tags as one-tap chips, plus a "+" that
 * opens a find-or-create field. Picks apply immediately.
 */
export function PostSaveTags({ suppressed }: { suppressed?: boolean }) {
  const saved = useSavedBookmarkTray((state) => state.saved);
  const dismiss = useSavedBookmarkTray((state) => state.dismiss);
  const reduceMotion = useReducedMotion();
  // Warm the suggestions so the chips are there when the tray lands.
  useAuthedQuery(api.tags.queries.topManualTags, { limit: SUGGESTION_COUNT });

  useEffect(() => dismiss, [dismiss]);

  const hidden = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 16, scale: 0.96 };

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center px-3">
      <AnimatePresence>
        {saved && !suppressed ? (
          <motion.div
            key="post-save-tags"
            data-testid="post-save-tags"
            role="region"
            aria-label="Bookmark saved"
            initial={hidden}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ ...hidden, transition: FADE }}
            transition={{ ...SPRING_SNAPPY, opacity: FADE }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                dismiss();
              }
            }}
            className="pointer-events-auto w-full max-w-[44rem] rounded-full bg-foreground p-1 text-background shadow-[0_12px_32px_-12px_color-mix(in_oklch,var(--foreground)_45%,transparent)] ring-1 ring-foreground/10"
          >
            {/* A newer save replaces the content in place, state and all. */}
            <motion.div
              key={saved.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={FADE}
            >
              <TrayContent saved={saved} onDismiss={dismiss} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
