import { useRef } from "react";

export type StableQueryResult<T> = {
  /** Last resolved value — stays on screen while the next one loads. */
  data: T | undefined;
  /** True only on the very first load, when there is nothing to show yet. */
  isLoading: boolean;
  /** True when `data` is the previous result and a new one is in flight. */
  isStale: boolean;
};

/**
 * useStableQuery — keep-previous-data for Convex subscriptions.
 *
 * Convex re-renders with `undefined` every time the query arguments change, so
 * a naive `if (!data) return null` blanks the entire page on each filter, sort,
 * page or navigation change. Holding the last resolved value lets the UI dim
 * the stale content instead of unmounting it, which is the difference between a
 * full-page loader and an instant, responsive table.
 */
export function useStableQuery<T>(
  value: T | undefined,
  identity?: string,
): StableQueryResult<T> {
  const lastResolved = useRef<{ identity?: string; value: T } | undefined>(
    undefined,
  );

  // Holding the previous value is only correct while it describes the *same*
  // record. TanStack Router reuses the component instance across a param
  // change (no `remountDeps` anywhere in this app), so without this reset a
  // navigation from /admin/users/A to /admin/users/B would keep rendering A's
  // name, email and limits under B's URL — and bind B's ban/limit actions to
  // A's id. Dropping the retained value on identity change degrades to a
  // skeleton, which is the correct thing to show for a record we have not
  // loaded yet.
  if (lastResolved.current && lastResolved.current.identity !== identity) {
    lastResolved.current = undefined;
  }

  // Deliberate render-phase ref write: this is the keep-previous-data pattern
  // from the Convex docs, and it is idempotent under double-render.
  if (value !== undefined) {
    lastResolved.current = { identity, value };
  }

  const retained = lastResolved.current;

  return {
    data: retained?.value,
    isLoading: value === undefined && retained === undefined,
    isStale: value === undefined && retained !== undefined,
  };
}
