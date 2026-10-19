import { BookmarkFavicon } from "@/features/app/bookmark-favicon";
import { normalizeBookmarkUrl } from "@/features/app/schema";
import { useCreateBookmarkAction } from "@/features/app/use-create-bookmark";
import { useTheme } from "@/features/dark-mode/theme-provider";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { APP_LINKS } from "@/lib/app-links";
import { BookmarkType } from "@/lib/bookmark-types";
import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { Loader } from "@workspace/ui/components/loader";
import { cn } from "@workspace/ui/lib/utils";
import { CommandPrimitive } from "@workspace/ui/components/command";
import {
  CircleDot,
  CornerDownLeft,
  FileDown,
  Hash,
  Keyboard,
  Library,
  Link2,
  type LucideIcon,
  MessageCircle,
  Moon,
  Plus,
  Puzzle,
  Search,
  Sparkles,
  Star,
  Sun,
  Tags,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatShortcutKey } from "../shell/shortcuts";
import { openFeedback } from "../shell/sidebar-user-menu";
import { useAppShell } from "../shell/use-app-shell";
import {
  type CommandPaletteMode,
  useCommandPalette,
} from "./command-palette-provider";
import {
  type PaletteBookmark,
  usePaletteBookmarks,
  useRecentlyOpened,
} from "./use-recently-opened";

type PaletteItem = {
  id: string;
  title: ReactNode;
  subtitle?: string;
  icon: ReactNode;
  /** Shown on the right; defaults to ↵ on the selected row. */
  hint?: ReactNode;
  onSelect: () => void;
};

type PaletteGroup = { heading: string; items: PaletteItem[] };

type TagRow = { id: string; name: string };

const MAX_BOOKMARK_MATCHES = 6;
const MAX_TAG_MATCHES = 4;

export function CommandPalette() {
  const { isOpen, close, mode, initialQuery } = useCommandPalette();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : close())}>
      <DialogContent
        showCloseButton={false}
        className="top-[14vh] w-[calc(100%-1.5rem)] max-w-[640px] translate-y-0 gap-0 overflow-hidden rounded-[14px] bg-popover p-0 shadow-2xl ring-foreground/10 sm:max-w-[640px]"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search your library, ask AI, save a link or jump anywhere.
        </DialogDescription>
        {isOpen ? (
          <PaletteBody
            initialMode={mode}
            initialQuery={initialQuery}
            onClose={close}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function looksLikeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  return normalizeBookmarkUrl(trimmed);
}

function IconTile({
  icon: Icon,
  tone = "muted",
}: {
  icon: LucideIcon;
  tone?: "muted" | "primary";
}) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md ring-1",
        tone === "primary"
          ? "bg-primary/10 text-primary ring-primary/15"
          : "bg-muted text-muted-foreground ring-foreground/5",
      )}
    >
      <Icon className="size-[15px]" />
    </span>
  );
}

function FaviconTile({ bookmark }: { bookmark: PaletteBookmark }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground ring-1 ring-foreground/8">
      <BookmarkFavicon
        faviconUrl={bookmark.faviconUrl}
        bookmarkType={bookmark.type ?? BookmarkType.PAGE}
        status={bookmark.status}
      />
    </span>
  );
}

function PaletteBody({
  initialMode,
  initialQuery,
  onClose,
}: {
  initialMode: CommandPaletteMode;
  initialQuery: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { setShortcutsOpen } = useAppShell();
  const { resolvedTheme, setTheme } = useTheme();
  const [mode, setMode] = useState(initialMode);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const lowered = trimmed.toLowerCase();
  const url = looksLikeUrl(trimmed);

  const recent = useRecentlyOpened({ limit: 6 });
  const libraryBookmarks = usePaletteBookmarks({ enabled: true });
  const tagsResult = useAuthedQuery(
    api.tags.queries.list,
    trimmed && !url
      ? { paginationOpts: { numItems: 200, cursor: null }, query: trimmed }
      : "skip",
  ) as { page?: TagRow[] } | undefined;

  const createBookmark = useCreateBookmarkAction({
    onSuccess: () => {
      toast.success("Saved to your library");
      onClose();
    },
  });

  const go = (to: string, search?: Record<string, string>) => {
    onClose();
    void navigate({ to, search: (search ?? {}) as never });
  };

  const askAi = (question: string) => go("/app/agents", { q: question });

  const navigationItems: PaletteItem[] = [
    {
      id: "nav-library",
      title: "Library",
      icon: <IconTile icon={Library} />,
      onSelect: () => go("/app"),
    },
    {
      id: "nav-unread",
      title: "Unread",
      icon: <IconTile icon={CircleDot} />,
      onSelect: () => go("/app", { special: "UNREAD" }),
    },
    {
      id: "nav-starred",
      title: "Starred",
      icon: <IconTile icon={Star} />,
      onSelect: () => go("/app", { special: "STAR" }),
    },
    {
      id: "nav-ask-ai",
      title: "Ask AI",
      icon: <IconTile icon={Sparkles} />,
      onSelect: () => go("/app/agents"),
    },
    {
      id: "nav-tags",
      title: "Tags",
      icon: <IconTile icon={Tags} />,
      onSelect: () => go(APP_LINKS.tags),
    },
    {
      id: "nav-imports",
      title: "Imports",
      icon: <IconTile icon={FileDown} />,
      onSelect: () => go(APP_LINKS.imports),
    },
  ];

  const actionItems: PaletteItem[] = [
    {
      id: "action-add",
      title: "Add bookmark",
      icon: <IconTile icon={Plus} />,
      onSelect: () => {
        setMode("add");
        setQuery("");
        inputRef.current?.focus();
      },
    },
    {
      id: "action-theme",
      title: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      icon: <IconTile icon={resolvedTheme === "dark" ? Sun : Moon} />,
      onSelect: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    },
    {
      id: "action-shortcuts",
      title: "Keyboard shortcuts",
      icon: <IconTile icon={Keyboard} />,
      hint: <Kbd>?</Kbd>,
      onSelect: () => {
        onClose();
        setShortcutsOpen(true);
      },
    },
    {
      id: "action-feedback",
      title: "Send feedback",
      icon: <IconTile icon={MessageCircle} />,
      onSelect: () => {
        onClose();
        openFeedback();
      },
    },
  ];

  const bookmarkItem = (bookmark: PaletteBookmark, prefix: string) => ({
    id: `${prefix}-${bookmark.id}`,
    title: bookmark.title || domainOf(bookmark.url),
    subtitle: domainOf(bookmark.url),
    icon: <FaviconTile bookmark={bookmark} />,
    onSelect: () => {
      onClose();
      void navigate({
        to: "/app/b/$bookmarkId",
        params: { bookmarkId: bookmark.id },
      });
    },
  });

  const groups: PaletteGroup[] = [];

  if (trimmed === "") {
    if (mode === "add") {
      groups.push({
        heading: "More ways to save",
        items: [
          {
            id: "add-import",
            title: "Import bookmarks",
            subtitle: "Browser export, Pocket, Raindrop, CSV",
            icon: <IconTile icon={FileDown} />,
            onSelect: () => go(APP_LINKS.imports),
          },
          {
            id: "add-extension",
            title: "Install the browser extension",
            icon: <IconTile icon={Puzzle} />,
            onSelect: () => go(APP_LINKS.extensions),
          },
        ],
      });
    } else {
      if (recent && recent.length > 0) {
        groups.push({
          heading: "Recent",
          items: recent.map((bookmark) => bookmarkItem(bookmark, "recent")),
        });
      }
      groups.push({ heading: "Navigation", items: navigationItems });
      groups.push({ heading: "Actions", items: actionItems });
    }
  } else {
    const top: PaletteItem[] = [];
    if (url) {
      top.push({
        id: "save-url",
        title: (
          <>
            Save <span className="font-normal text-muted-foreground">{domainOf(url)}</span>
          </>
        ),
        subtitle: url,
        icon: <IconTile icon={Link2} tone="primary" />,
        onSelect: () => {
          if (!createBookmark.isPending) createBookmark.execute({ url });
        },
      });
    }
    if (mode !== "add" || !url) {
      top.push({
        id: "ask-ai",
        title: (
          <>
            Ask AI: <span className="font-normal">“{trimmed}”</span>
          </>
        ),
        icon: <IconTile icon={Sparkles} tone="primary" />,
        hint: (
          <KbdGroup>
            <Kbd>{formatShortcutKey("mod")}</Kbd>
            <Kbd>
              <CornerDownLeft />
            </Kbd>
          </KbdGroup>
        ),
        onSelect: () => askAi(trimmed),
      });
      top.push({
        id: "search-library",
        title: (
          <>
            Search library for <span className="font-normal">“{trimmed}”</span>
          </>
        ),
        icon: <IconTile icon={Search} />,
        onSelect: () => go("/app", { query: trimmed }),
      });
    }
    groups.push({ heading: url ? "Save" : "Search", items: top });

    const matches = (libraryBookmarks ?? [])
      .filter(
        (bookmark) =>
          bookmark.title?.toLowerCase().includes(lowered) ||
          bookmark.url.toLowerCase().includes(lowered),
      )
      .slice(0, MAX_BOOKMARK_MATCHES);
    if (matches.length > 0) {
      groups.push({
        heading: "Bookmarks",
        items: matches.map((bookmark) => bookmarkItem(bookmark, "match")),
      });
    }

    const tagMatches = (tagsResult?.page ?? []).slice(0, MAX_TAG_MATCHES);
    if (tagMatches.length > 0) {
      groups.push({
        heading: "Tags",
        items: tagMatches.map((tag) => ({
          id: `tag-${tag.id}`,
          title: tag.name,
          icon: <IconTile icon={Hash} />,
          onSelect: () => go("/app", { tags: tag.name }),
        })),
      });
    }

    const commandMatches = [...navigationItems, ...actionItems].filter(
      (item) =>
        typeof item.title === "string" &&
        item.title.toLowerCase().includes(lowered),
    );
    if (commandMatches.length > 0) {
      groups.push({ heading: "Commands", items: commandMatches });
    }
  }

  const firstId = groups[0]?.items[0]?.id ?? "";
  useEffect(() => {
    setSelected(firstId);
  }, [firstId, trimmed, mode]);

  const isLoadingMatches = trimmed !== "" && !url && libraryBookmarks === undefined;

  return (
    <CommandPrimitive
      label="Command palette"
      shouldFilter={false}
      loop
      value={selected}
      onValueChange={setSelected}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          (event.metaKey || event.ctrlKey) &&
          trimmed !== ""
        ) {
          event.preventDefault();
          askAi(trimmed);
        }
        if (event.key === "Backspace" && query === "" && mode === "add") {
          setMode("search");
        }
      }}
      className="flex min-w-0 flex-col"
    >
      <div className="flex h-13 items-center gap-2.5 border-b border-border px-4">
        {mode === "add" ? (
          <Plus className="size-4 shrink-0 text-primary" />
        ) : (
          <Search className="size-4 shrink-0 text-muted-foreground" />
        )}
        <CommandPrimitive.Input
          ref={inputRef}
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder={
            mode === "add"
              ? "Paste a link to save it…"
              : "Search, ask AI, or paste a link…"
          }
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/80"
        />
        {isLoadingMatches || createBookmark.isPending ? (
          <Loader className="size-4 text-muted-foreground" />
        ) : null}
        <Kbd className="hidden sm:inline-flex">Esc</Kbd>
      </div>

      {mode === "add" && trimmed === "" ? (
        <div className="flex items-start gap-3 border-b border-border px-4 py-3.5">
          <IconTile icon={Link2} tone="primary" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">
              Paste any URL
            </p>
            <p className="text-[12px] leading-snug text-muted-foreground">
              SaveIt fetches the page, takes a screenshot, writes a summary and
              tags it for you.
            </p>
          </div>
        </div>
      ) : null}

      <CommandPrimitive.List className="max-h-[min(420px,56vh)] scroll-py-2 overflow-x-hidden overflow-y-auto overscroll-contain p-1.5 outline-none">
        <CommandPrimitive.Empty className="py-10 text-center text-[13px] text-muted-foreground">
          Nothing found.
        </CommandPrimitive.Empty>
        {groups.map((group) => (
          <CommandPrimitive.Group
            key={group.heading}
            heading={group.heading}
            className="pb-1 **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1.5 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground"
          >
            {group.items.map((item) => (
              <CommandPrimitive.Item
                key={item.id}
                value={item.id}
                onSelect={item.onSelect}
                className="group/item flex h-11 cursor-default items-center gap-3 rounded-lg px-2.5 text-[13.5px] text-foreground outline-none select-none data-[selected=true]:bg-accent"
              >
                {item.icon}
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="min-w-0 truncate font-medium">{item.title}</span>
                  {item.subtitle ? (
                    <span className="max-w-[45%] shrink-0 truncate text-[12px] text-muted-foreground">
                      {item.subtitle}
                    </span>
                  ) : null}
                </span>
                {item.hint ? (
                  <span className="shrink-0">{item.hint}</span>
                ) : (
                  <Kbd className="hidden shrink-0 group-data-[selected=true]/item:inline-flex">
                    <CornerDownLeft />
                  </Kbd>
                )}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.Group>
        ))}
      </CommandPrimitive.List>

      <div className="flex h-10 items-center gap-4 border-t border-border bg-muted/40 px-4 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <KbdGroup>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </KbdGroup>
          Navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>
            <CornerDownLeft />
          </Kbd>
          Open
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <KbdGroup>
            <Kbd>{formatShortcutKey("mod")}</Kbd>
            <Kbd>
              <CornerDownLeft />
            </Kbd>
          </KbdGroup>
          Ask AI
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Kbd>Esc</Kbd>
          Close
        </span>
      </div>
    </CommandPrimitive>
  );
}

