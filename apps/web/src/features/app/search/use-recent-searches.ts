import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "saveit:recent-searches";
const MAX_RECENT_SEARCHES = 8;
const EMPTY: string[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: string[] = EMPTY;

function read(): string[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedValue = Array.isArray(parsed)
      ? parsed
          .filter((v): v is string => typeof v === "string")
          .slice(0, MAX_RECENT_SEARCHES)
      : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
}

function write(next: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or disabled: recents are a convenience, drop silently.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Last searches typed in the library field, newest first, deduped case-insensitively. */
export function useRecentSearches() {
  const recents = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((query: string) => {
    const value = query.trim().replace(/\s+/g, " ");
    if (value.length < 2) return;
    const lower = value.toLowerCase();
    write(
      [value, ...read().filter((v) => v.toLowerCase() !== lower)].slice(
        0,
        MAX_RECENT_SEARCHES,
      ),
    );
  }, []);

  const remove = useCallback((query: string) => {
    write(read().filter((v) => v !== query));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { recents, add, remove, clear };
}
