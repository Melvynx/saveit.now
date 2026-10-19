"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import dayjs from "dayjs";
import { SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  type ConversationListItem,
  groupConversations,
} from "../chat-utils";

type ConversationHistoryProps = {
  conversations: ConversationListItem[] | undefined;
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onClose?: () => void;
  autoFocusSearch?: boolean;
  className?: string;
};

function formatTime(time: number) {
  const date = dayjs(time);
  if (date.isSame(dayjs(), "day")) return date.format("HH:mm");
  if (date.isAfter(dayjs().subtract(7, "day"))) return date.format("ddd");
  return date.format("MMM D");
}

export function ConversationHistory({
  conversations,
  currentConversationId,
  onSelect,
  onDelete,
  onClose,
  autoFocusSearch,
  className,
}: ConversationHistoryProps) {
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] =
    useState<ConversationListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (conversations ?? []).filter(
      (conversation) =>
        !needle ||
        (conversation.title ?? "untitled").toLowerCase().includes(needle),
    );
    return groupConversations(filtered);
  }, [conversations, query]);

  const focusRow = (direction: 1 | -1 | "first" | "last") => {
    const rows = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-history-row]",
      ) ?? [],
    );
    if (!rows.length) return;
    const current = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      direction === "first"
        ? 0
        : direction === "last"
          ? rows.length - 1
          : current === -1
            ? 0
            : Math.min(rows.length - 1, Math.max(0, current + direction));
    rows[next]?.focus();
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusRow(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusRow(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusRow("first");
    } else if (event.key === "End") {
      event.preventDefault();
      focusRow("last");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(pendingDelete._id);
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex h-13 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="flex-1 text-[13px] font-medium text-foreground">
          History
        </h2>
        {onClose ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Close history"
            className="text-muted-foreground"
          >
            <XIcon />
          </Button>
        ) : null}
      </div>

      <div className="shrink-0 px-3 pt-3 pb-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            autoFocus={autoFocusSearch}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                focusRow("first");
              }
              if (event.key === "Escape" && query) {
                event.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="h-8 w-full rounded-lg bg-muted/60 pr-2 pl-8 text-[13px] text-foreground outline-none ring-1 ring-transparent transition-shadow placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-ring/60 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      </div>

      <div
        ref={listRef}
        onKeyDown={handleListKeyDown}
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-3"
      >
        {conversations === undefined ? (
          <div className="flex flex-col gap-1.5 px-1 pt-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 rounded-md" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
            {query ? `No conversations match “${query}”` : "No conversations yet"}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="pt-2">
              <div className="px-2 pt-1 pb-1 text-[11px] font-medium text-muted-foreground">
                {group.label}
              </div>
              {group.items.map((conversation) => {
                const active = currentConversationId === conversation._id;
                const title = conversation.title || "Untitled";
                return (
                  <div
                    key={conversation._id}
                    className={cn(
                      "group/row relative flex h-8 items-center rounded-md transition-colors duration-150",
                      active ? "bg-accent" : "hover:bg-muted/70",
                    )}
                  >
                    <button
                      type="button"
                      data-history-row
                      aria-current={active ? "true" : undefined}
                      onClick={() => onSelect(conversation._id)}
                      onKeyDown={(event) => {
                        if (event.key === "Delete" || event.key === "Backspace") {
                          event.preventDefault();
                          setPendingDelete(conversation);
                        }
                      }}
                      title={title}
                      className={cn(
                        "flex h-full min-w-0 flex-1 items-center gap-2 rounded-md pr-9 pl-2 text-left text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        active
                          ? "font-medium text-foreground"
                          : "text-foreground/80",
                      )}
                    >
                      {active ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">{title}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums transition-opacity group-focus-within/row:opacity-0 group-hover/row:opacity-0 [@media(hover:none)]:opacity-0">
                        {formatTime(conversation.updatedAt)}
                      </span>
                    </button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Delete “${title}”`}
                      onClick={() => setPendingDelete(conversation)}
                      className="absolute right-1 text-muted-foreground opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 hover:text-destructive focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title || "Untitled"}” will be removed. Your
              bookmarks are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
