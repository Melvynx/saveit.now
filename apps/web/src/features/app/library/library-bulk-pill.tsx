import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { getErrorMessage } from "@/lib/errors";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Kbd } from "@workspace/ui/components/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation } from "convex/react";
import {
  BookOpenCheck,
  Hash,
  Loader2,
  Plus,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { BookmarkCardData } from "../bookmark-card/bookmark.types";
import { useLibrarySelection } from "./selection-store";

const BULK_LIMIT = 100;

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

function PillButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-background/85 transition-colors outline-none hover:bg-background/12 hover:text-background focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type TagRow = { id: string; name: string };

function BulkTagPopover({
  ids,
  onDone,
}: {
  ids: Id<"bookmarks">[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const bulkAddTag = useMutation(api.tags.mutations.bulkAddTag);
  const tagsPage = useAuthedQuery(
    api.tags.queries.list,
    open ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
  );
  const tags = useMemo(() => {
    const all = ((tagsPage?.page ?? []) as TagRow[]).filter(Boolean);
    const query = name.trim().toLowerCase().replace(/^#/, "");
    return all
      .filter((tag) => !query || tag.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [tagsPage, name]);
  const typed = name.trim().replace(/^#/, "");
  const exactMatch = tags.some(
    (tag) => tag.name.toLowerCase() === typed.toLowerCase(),
  );

  const apply = async (tagName: string) => {
    const clean = tagName.trim().replace(/^#/, "");
    if (!clean || pending) return;
    setPending(true);
    try {
      let tagged = 0;
      for (const batch of chunk(ids, BULK_LIMIT)) {
        const result = await bulkAddTag({ bookmarkIds: batch, tagName: clean });
        tagged += result.tagged;
      }
      toast.success(`Tagged ${plural(tagged, "bookmark")} with #${clean}`);
      setOpen(false);
      setName("");
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to add tag"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PillButton aria-label="Add a tag to selected bookmarks">
          <Tag />
          <span className="hidden sm:inline">Tag…</span>
        </PillButton>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" sideOffset={10} className="w-64 gap-0 p-1.5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void apply(typed);
          }}
          className="flex items-center gap-2 border-b border-border px-2 pb-1.5"
        >
          <Hash className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tag name"
            aria-label="Tag name"
            className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          {pending ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : null}
        </form>
        <div className="flex max-h-60 flex-col overflow-y-auto pt-1">
          {typed && !exactMatch ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void apply(typed)}
              className="flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-accent"
            >
              <Plus className="size-3.5 text-muted-foreground" />
              Create <span className="font-medium">#{typed}</span>
            </button>
          ) : null}
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              disabled={pending}
              onClick={() => void apply(tag.name)}
              className="flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] text-foreground hover:bg-accent"
            >
              <Hash className="size-3.5 text-muted-foreground" />
              <span className="truncate">{tag.name}</span>
            </button>
          ))}
          {!typed && tags.length === 0 ? (
            <p className="px-2 py-2 text-[12px] text-muted-foreground">
              {tagsPage ? "Type a name to create a tag." : "Loading tags…"}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Floating bottom-center bar for the current selection. Sticky inside the
 * page so it centers on the content column, not the window.
 */
export function LibraryBulkPill({ bookmarks }: { bookmarks: BookmarkCardData[] }) {
  const selectedIds = useLibrarySelection((state) => state.selectedIds);
  const clear = useLibrarySelection((state) => state.clear);
  const bulkUpdate = useMutation(api.bookmarks.mutations.bulkUpdate);
  const bulkRemove = useMutation(api.bookmarks.mutations.bulkRemove);
  const [busy, setBusy] = useState<"star" | "read" | "delete" | null>(null);
  const reduceMotion = useReducedMotion();

  const selected = useMemo(
    () => bookmarks.filter((bookmark) => selectedIds.has(bookmark.id)),
    [bookmarks, selectedIds],
  );
  const ids = selected.map((bookmark) => bookmark.id as Id<"bookmarks">);
  const count = ids.length;
  const allStarred = count > 0 && selected.every((bookmark) => bookmark.starred);
  const readable = selected.filter(
    (bookmark) => bookmark.type === "ARTICLE" || bookmark.type === "YOUTUBE",
  );
  const allRead = readable.length > 0 && readable.every((bookmark) => bookmark.read);

  const runUpdate = async (
    kind: "star" | "read",
    patch: { starred?: boolean; read?: boolean },
    message: (updated: number) => string,
  ) => {
    setBusy(kind);
    try {
      let updated = 0;
      for (const batch of chunk(ids, BULK_LIMIT)) {
        const result = await bulkUpdate({ ids: batch, ...patch });
        updated += result.updated;
      }
      toast.success(message(updated));
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update bookmarks"));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () => {
    const toDelete = [...ids];
    dialogManager.add({
      title: `Delete ${plural(toDelete.length, "bookmark")}?`,
      description:
        "They will be removed from your library, along with their tags and notes. This can't be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          setBusy("delete");
          try {
            let removed = 0;
            for (const batch of chunk(toDelete, BULK_LIMIT)) {
              const result = await bulkRemove({ ids: batch });
              removed += result.removed;
            }
            trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_DELETED, {
              surface: "bulk_selection",
              count: removed,
            });
            toast.success(`Deleted ${plural(removed, "bookmark")}`);
            clear();
          } catch (error) {
            toast.error(getErrorMessage(error, "Failed to delete bookmarks"));
          } finally {
            setBusy(null);
          }
        },
      },
    });
  };

  return (
    <div className="pointer-events-none sticky bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 mt-auto flex h-0 items-start justify-center overflow-visible">
      <AnimatePresence>
        {count > 0 ? (
          <motion.div
            key="bulk-pill"
            role="toolbar"
            aria-label="Selected bookmarks"
            data-testid="bulk-pill"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="pointer-events-auto flex -translate-y-full items-center gap-0.5 rounded-full bg-foreground p-1 text-background shadow-[0_12px_32px_-12px_color-mix(in_oklch,var(--foreground)_45%,transparent)] ring-1 ring-foreground/10"
          >
            <span className="flex h-8 items-center gap-2 pr-2 pl-3 text-[13px] font-semibold tabular-nums">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                {count > 99 ? "99+" : count}
              </span>
              selected
            </span>
            <span className="mx-0.5 h-4 w-px bg-background/15" aria-hidden />
            <PillButton
              disabled={busy !== null}
              onClick={() =>
                void runUpdate(
                  "star",
                  { starred: !allStarred },
                  (updated) =>
                    `${allStarred ? "Unstarred" : "Starred"} ${plural(updated, "bookmark")}`,
                )
              }
            >
              {busy === "star" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Star className={cn(allStarred && "fill-current")} />
              )}
              <span className="hidden sm:inline">
                {allStarred ? "Unstar" : "Star"}
              </span>
            </PillButton>
            <PillButton
              disabled={busy !== null || readable.length === 0}
              title={
                readable.length === 0
                  ? "Only articles and videos have a read state"
                  : undefined
              }
              onClick={() =>
                void runUpdate(
                  "read",
                  { read: !allRead },
                  (updated) =>
                    `Marked ${plural(updated, "bookmark")} as ${allRead ? "unread" : "read"}`,
                )
              }
            >
              {busy === "read" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <BookOpenCheck />
              )}
              <span className="hidden sm:inline">
                {allRead ? "Mark unread" : "Mark read"}
              </span>
            </PillButton>
            <BulkTagPopover ids={ids} onDone={() => undefined} />
            <PillButton
              disabled={busy !== null}
              onClick={confirmDelete}
              className="hover:bg-destructive/25 hover:text-background"
            >
              {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
              <span className="hidden sm:inline">Delete</span>
            </PillButton>
            <span className="mx-0.5 h-4 w-px bg-background/15" aria-hidden />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear selection"
              onClick={clear}
              className="size-8 rounded-full text-background/70 hover:bg-background/12 hover:text-background"
            >
              <X className="size-3.5" />
            </Button>
            <Kbd className="mr-2 hidden bg-background/12 text-background/70 ring-background/15 md:inline-flex">
              Esc
            </Kbd>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
