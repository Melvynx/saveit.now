import { BookmarkType } from "@/lib/bookmark-types";
import {
  parseAsArrayOf,
  parseAsFloat,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useCallback, useMemo } from "react";

export type SpecialFilter = "STAR" | "UNREAD" | "READ";

const BOOKMARK_TYPES = Object.values(BookmarkType) as BookmarkType[];
const SPECIAL_FILTERS: SpecialFilter[] = ["STAR", "UNREAD", "READ"];

export const DEFAULT_MATCHING_DISTANCE = 0.1;
/** Scores are 0..1, so a spread of 1 already returns every candidate. */
export const MAX_MATCHING_DISTANCE = 1;
const MATCHING_DISTANCE_STEPS = [0.1, 0.25, 0.5, 1];

const searchFilterParsers = {
  query: parseAsString.withDefault(""),
  types: parseAsArrayOf(parseAsStringLiteral(BOOKMARK_TYPES)).withDefault([]),
  tags: parseAsArrayOf(parseAsString).withDefault([]),
  special: parseAsArrayOf(parseAsStringLiteral(SPECIAL_FILTERS)).withDefault(
    [],
  ),
  matchingDistance: parseAsFloat.withDefault(DEFAULT_MATCHING_DISTANCE),
};

export function nextMatchingDistance(current: number): number | null {
  const next = MATCHING_DISTANCE_STEPS.find((step) => step > current + 1e-6);
  return next ?? null;
}

/**
 * Library search state stored in the URL (`query`, `types`, `tags`, `special`,
 * `matchingDistance`). `useBookmarks` reads the same keys.
 */
export function useSearchFilters() {
  const [state, setState] = useQueryStates(searchFilterParsers);

  const toggleType = useCallback(
    (type: BookmarkType) =>
      setState((prev) => ({
        types: prev.types.includes(type)
          ? prev.types.filter((t) => t !== type)
          : [...prev.types, type],
        matchingDistance: null,
      })),
    [setState],
  );

  const addTags = useCallback(
    (names: string[]) =>
      setState((prev) => ({
        tags: [...new Set([...prev.tags, ...names])],
        matchingDistance: null,
      })),
    [setState],
  );

  const setTags = useCallback(
    (tags: string[]) => setState({ tags, matchingDistance: null }),
    [setState],
  );

  const removeTag = useCallback(
    (name: string) =>
      setState((prev) => ({ tags: prev.tags.filter((t) => t !== name) })),
    [setState],
  );

  /** Starred / Unread are separate views, so only one special is active. */
  const toggleSpecial = useCallback(
    (filter: SpecialFilter) =>
      setState((prev) => ({
        special: prev.special.includes(filter) ? [] : [filter],
        matchingDistance: null,
      })),
    [setState],
  );

  const clearFilters = useCallback(
    () =>
      setState({
        types: null,
        tags: null,
        special: null,
        matchingDistance: null,
      }),
    [setState],
  );

  const hasFilters =
    state.types.length > 0 || state.tags.length > 0 || state.special.length > 0;

  return useMemo(
    () => ({
      ...state,
      hasFilters,
      setState,
      toggleType,
      addTags,
      setTags,
      removeTag,
      toggleSpecial,
      clearFilters,
    }),
    [
      state,
      hasFilters,
      setState,
      toggleType,
      addTags,
      setTags,
      removeTag,
      toggleSpecial,
      clearFilters,
    ],
  );
}
