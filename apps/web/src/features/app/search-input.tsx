"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { Kbd } from "@workspace/ui/components/kbd";
import { cn } from "@workspace/ui/lib/utils";
import { Loader2, Search, X } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTagSuggestions } from "./hooks/use-tags";
import { URL_SCHEMA } from "./schema";
import {
  SearchSuggestions,
  type SearchSuggestionItem,
} from "./search/search-suggestions";
import { useRecentSearches } from "./search/use-recent-searches";
import { useSearchFilters } from "./search/use-search-filters";
import { isTypingTarget } from "./shell/shortcuts";
import {
  extractSyntaxTokens,
  getTagTokenAtCaret,
} from "./utils/type-filter-utils";

export type SearchInputRef = {
  focus: () => void;
};

type SearchInputProps = {
  /** True while results for the current query are loading. */
  isLoading?: boolean;
  className?: string;
};

/** Mirrors the debounce in `useBookmarks` so the spinner covers the wait. */
const QUERY_DEBOUNCE_MS = 500;
/** A half-typed filter token at the end of the text is not searched yet. */
const PENDING_TOKEN = /(^|\s)(#\S*|(?:type|is):\S*)$/i;

const toUrlQuery = (text: string) => text.replace(PENDING_TOKEN, "$1");

export const SearchInput = forwardRef<SearchInputRef, SearchInputProps>(
  ({ isLoading = false, className }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();
    const filters = useSearchFilters();
    const { query: urlQuery, setState } = filters;
    const recentSearches = useRecentSearches();

    const [text, setText] = useState(urlQuery);
    const [caret, setCaret] = useState(urlQuery.length);
    const [isFocused, setIsFocused] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const pendingCaretRef = useRef<number | null>(null);

    // External URL changes (palette, sidebar, recents, clear) win over the field.
    useEffect(() => {
      setText((current) =>
        toUrlQuery(current) === urlQuery ? current : urlQuery,
      );
    }, [urlQuery]);

    useEffect(() => {
      if (pendingCaretRef.current === null) return;
      const position = pendingCaretRef.current;
      pendingCaretRef.current = null;
      inputRef.current?.setSelectionRange(position, position);
      setCaret(position);
    }, [text]);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // "/" focuses the field from anywhere on the page.
    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (
          event.key !== "/" ||
          event.metaKey ||
          event.ctrlKey ||
          event.altKey ||
          isTypingTarget(event.target) ||
          document.querySelector("[role=dialog]")
        ) {
          return;
        }
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const debouncedText = useDebounce(text, QUERY_DEBOUNCE_MS);
    const isDebouncing = toUrlQuery(text).trim() !== toUrlQuery(debouncedText).trim();
    const showSpinner = Boolean(text.trim()) && (isDebouncing || isLoading);

    const isUrl = URL_SCHEMA.safeParse(text.trim()).success;
    const tagToken = isFocused && !isUrl ? getTagTokenAtCaret(text, caret) : null;
    const tagSuggestions = useTagSuggestions(tagToken ? tagToken.prefix : null);

    const mode: "recent" | "tags" | null = tagToken
      ? "tags"
      : text.trim() === ""
        ? "recent"
        : null;

    const items: SearchSuggestionItem[] =
      mode === "tags"
        ? tagSuggestions
            .filter((tag) => !filters.tags.includes(tag.name))
            .map((tag) => ({ kind: "tag", value: tag.name }))
        : mode === "recent"
          ? recentSearches.recents.map((value) => ({ kind: "recent", value }))
          : [];

    const isOpen =
      dropdownOpen && isFocused && mode !== null && (mode === "recent" || items.length > 0);

    useEffect(() => {
      setActiveIndex(-1);
    }, [mode, items.length]);

    /** Writes text to the URL, converting finished filter tokens to filters. */
    const commit = (
      nextText: string,
      { includeTrailing = false, caretAt }: { includeTrailing?: boolean; caretAt?: number } = {},
    ) => {
      const extracted = URL_SCHEMA.safeParse(nextText.trim()).success
        ? null
        : extractSyntaxTokens(nextText, { includeTrailing });

      if (!extracted || extracted.tokens.length === 0) {
        setText(nextText);
        void setState({ query: toUrlQuery(nextText) || null });
        return nextText;
      }

      const cleaned = extracted.text;
      const removed = nextText.length - cleaned.length;
      const position = Math.max(
        0,
        Math.min(cleaned.length, (caretAt ?? nextText.length) - removed),
      );
      pendingCaretRef.current = position;
      setText(cleaned);
      void setState((prev) => ({
        query: toUrlQuery(cleaned) || null,
        tags: extracted.tags.length
          ? [...new Set([...prev.tags, ...extracted.tags])]
          : prev.tags,
        types: extracted.types.length
          ? [...new Set([...prev.types, ...extracted.types])]
          : prev.types,
        special: extracted.special.length
          ? [extracted.special[extracted.special.length - 1]!]
          : prev.special,
        matchingDistance: null,
      }));
      return cleaned;
    };

    const saveRecent = (value: string) => {
      const trimmed = toUrlQuery(value).trim();
      if (!trimmed || URL_SCHEMA.safeParse(trimmed).success) return;
      recentSearches.add(trimmed);
    };

    const applySuggestion = (item: SearchSuggestionItem) => {
      if (item.kind === "recent") {
        setText(item.value);
        pendingCaretRef.current = item.value.length;
        void setState({ query: item.value, matchingDistance: null });
        recentSearches.add(item.value);
        setDropdownOpen(false);
        return;
      }
      if (!tagToken) return;
      const nextText = (
        text.slice(0, tagToken.start) + text.slice(tagToken.end)
      ).replace(/\s{2,}/g, " ");
      const position = Math.min(nextText.length, tagToken.start);
      pendingCaretRef.current = position;
      setText(nextText.trimStart());
      void setState((prev) => ({
        query: toUrlQuery(nextText.trim()) || null,
        tags: [...new Set([...prev.tags, item.value])],
        matchingDistance: null,
      }));
      inputRef.current?.focus();
    };

    const clear = () => {
      setText("");
      void setState({ query: null, matchingDistance: null });
      setDropdownOpen(true);
      inputRef.current?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" && isOpen && items.length > 0) {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
        return;
      }
      if (event.key === "ArrowUp" && isOpen && items.length > 0) {
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
        return;
      }
      if (event.key === "Tab" && isOpen && mode === "tags" && items.length > 0) {
        event.preventDefault();
        applySuggestion(items[Math.max(0, activeIndex)]!);
        return;
      }
      if (event.key === "Enter") {
        if (isOpen && activeIndex >= 0 && items[activeIndex]) {
          event.preventDefault();
          applySuggestion(items[activeIndex]);
          return;
        }
        if (isUrl) return;
        event.preventDefault();
        const cleaned = commit(text.trimEnd(), { includeTrailing: true }).trim();
        if (cleaned !== text) {
          setText(cleaned);
          void setState({ query: cleaned || null });
        }
        saveRecent(cleaned);
        setDropdownOpen(false);
        return;
      }
      if (event.key === "Escape") {
        if (isOpen) {
          event.preventDefault();
          event.stopPropagation();
          setDropdownOpen(false);
        } else if (text) {
          event.preventDefault();
          event.stopPropagation();
          clear();
          setDropdownOpen(false);
        } else {
          event.currentTarget.blur();
        }
        return;
      }
      if (event.key === "Backspace" && text === "" && !event.repeat) {
        // Backspace in an empty field peels off the last tag chip.
        const lastTag = filters.tags[filters.tags.length - 1];
        if (lastTag) {
          event.preventDefault();
          void filters.removeTag(lastTag);
        }
      }
    };

    const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;

    return (
      <div
        data-slot="search-input"
        className={cn("relative w-full min-w-0", className)}
      >
        <div
          className={cn(
            "group/search relative flex h-10 items-center rounded-[10px] bg-card ring-1 ring-border transition-[box-shadow,background-color] duration-150 ease-out",
            "hover:ring-foreground/15",
            "focus-within:ring-ring/60 focus-within:outline-3 focus-within:outline-ring/15",
          )}
        >
          <span className="pointer-events-none absolute left-3 flex size-4 items-center justify-center text-muted-foreground">
            {showSpinner ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
          </span>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Search your library"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              activeItem ? `${listboxId}-${activeIndex}` : undefined
            }
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Search your library…"
            value={text}
            onChange={(event) => {
              setDropdownOpen(true);
              setCaret(event.target.selectionStart ?? event.target.value.length);
              commit(event.target.value, {
                caretAt: event.target.selectionStart ?? undefined,
              });
            }}
            onSelect={(event) =>
              setCaret(event.currentTarget.selectionStart ?? text.length)
            }
            onFocus={() => {
              setIsFocused(true);
              setDropdownOpen(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setDropdownOpen(false);
              saveRecent(text);
            }}
            onKeyDown={onKeyDown}
            className={cn(
              "h-full w-full min-w-0 rounded-[10px] bg-transparent pr-20 pl-9 text-[14px] text-foreground outline-none placeholder:text-muted-foreground",
              "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            )}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {text ? (
              <button
                type="button"
                aria-label="Clear search"
                onMouseDown={(event) => event.preventDefault()}
                onClick={clear}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : (
              <Kbd
                className="hidden md:inline-flex"
                title="Press / to search"
              >
                /
              </Kbd>
            )}
          </div>
        </div>
        {isOpen ? (
          <SearchSuggestions
            id={listboxId}
            mode={mode}
            items={items}
            activeIndex={activeIndex}
            onHover={setActiveIndex}
            onSelect={applySuggestion}
            onRemoveRecent={recentSearches.remove}
            onClearRecents={recentSearches.clear}
          />
        ) : null}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
