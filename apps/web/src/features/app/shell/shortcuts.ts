export type ShortcutScope = "General" | "Library" | "Bookmark";

export type AppShortcut = {
  id: string;
  /** Display keys, rendered one Kbd each. "mod" renders as ⌘ or Ctrl. */
  keys: readonly string[];
  /** react-hotkeys-hook style binding, or null for pointer gestures. */
  hotkey: string | null;
  label: string;
  scope: ShortcutScope;
};

export const SHORTCUTS = [
  {
    id: "command-palette",
    keys: ["mod", "K"],
    hotkey: "mod+k",
    label: "Open command palette",
    scope: "General",
  },
  {
    id: "toggle-sidebar",
    keys: ["["],
    hotkey: "bracketleft",
    label: "Toggle sidebar",
    scope: "General",
  },
  {
    id: "shortcuts",
    keys: ["?"],
    hotkey: "shift+slash",
    label: "Show keyboard shortcuts",
    scope: "General",
  },
  {
    id: "close",
    keys: ["Esc"],
    hotkey: "escape",
    label: "Close dialog or panel",
    scope: "General",
  },
  {
    id: "navigate",
    keys: ["J", "K"],
    hotkey: "j, k",
    label: "Move between bookmarks",
    scope: "Library",
  },
  {
    id: "open",
    keys: ["Enter"],
    hotkey: "enter",
    label: "Open bookmark",
    scope: "Library",
  },
  {
    id: "select",
    keys: ["X"],
    hotkey: "x",
    label: "Select bookmark",
    scope: "Library",
  },
  {
    id: "range-select",
    keys: ["shift", "Click"],
    hotkey: null,
    label: "Select a range",
    scope: "Library",
  },
  {
    id: "cycle-view",
    keys: ["V"],
    hotkey: "v",
    label: "Cycle view",
    scope: "Library",
  },
  {
    id: "open-original",
    keys: ["O"],
    hotkey: "o",
    label: "Open original link",
    scope: "Bookmark",
  },
  {
    id: "star",
    keys: ["S"],
    hotkey: "s",
    label: "Star or unstar",
    scope: "Bookmark",
  },
  {
    id: "copy-link",
    keys: ["C"],
    hotkey: "c",
    label: "Copy link",
    scope: "Bookmark",
  },
  {
    id: "delete",
    keys: ["mod", "D"],
    hotkey: "mod+d",
    label: "Delete bookmark",
    scope: "Bookmark",
  },
] as const satisfies readonly AppShortcut[];

export type ShortcutId = (typeof SHORTCUTS)[number]["id"];

export const SHORTCUT_SCOPES: readonly ShortcutScope[] = [
  "General",
  "Library",
  "Bookmark",
];

export function getShortcut(id: ShortcutId): AppShortcut {
  const shortcut = SHORTCUTS.find((item) => item.id === id);
  if (!shortcut) throw new Error(`Unknown shortcut: ${id}`);
  return shortcut;
}

export function isMacPlatform() {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

export function formatShortcutKey(key: string) {
  if (key === "mod") return isMacPlatform() ? "⌘" : "Ctrl";
  if (key === "shift") return isMacPlatform() ? "⇧" : "Shift";
  if (key === "alt") return isMacPlatform() ? "⌥" : "Alt";
  if (key === "Enter") return "↵";
  return key;
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
