"use client";

import { formatShortcutKey } from "@/features/app/shell/shortcuts";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowUpRight,
  BookOpen,
  BookOpenCheck,
  Check,
  Copy,
  FileText,
  MoreHorizontal,
  RefreshCcw,
  Share,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import {
  getAskAiQuestion,
  getReaderUrl,
  supportsReadState,
} from "./bookmark-detail-utils";
import type { BookmarkDetailActions } from "./use-bookmark-detail-actions";

type ToolbarProps = {
  bookmark: BookmarkDetailDTO;
  actions: BookmarkDetailActions;
};

export function ShortcutHint({ keys }: { keys: readonly string[] }) {
  return (
    <KbdGroup>
      {keys.map((key) => (
        <Kbd key={key}>{formatShortcutKey(key)}</Kbd>
      ))}
    </KbdGroup>
  );
}

export function ActionTooltip({
  label,
  keys,
  children,
}: {
  label: string;
  keys?: readonly string[];
  children: ReactElement;
}) {
  return (
    <InlineTooltip
      title={
        <>
          <span>{label}</span>
          {keys ? <ShortcutHint keys={keys} /> : null}
        </>
      }
    >
      {children}
    </InlineTooltip>
  );
}

export function OpenOriginalButton({
  bookmark,
  actions,
  compact = false,
}: ToolbarProps & { compact?: boolean }) {
  return (
    <ActionTooltip label="Open original" keys={["O"]}>
      <Button asChild size="sm" className="gap-1.5 px-2.5">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="external-link-button"
          onClick={(event) => {
            event.preventDefault();
            actions.openOriginal();
          }}
        >
          <ArrowUpRight className="size-4" />
          <span className={cn(compact && "sr-only sm:not-sr-only")}>
            Open original
          </span>
        </a>
      </Button>
    </ActionTooltip>
  );
}

function IconAction({
  label,
  keys,
  onClick,
  children,
  testId,
  pressed,
}: {
  label: string;
  keys?: readonly string[];
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  pressed?: boolean;
}) {
  return (
    <ActionTooltip label={label} keys={keys}>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={label}
        aria-pressed={pressed}
        data-testid={testId}
        className="text-muted-foreground hover:text-foreground"
        onClick={onClick}
      >
        {children}
      </Button>
    </ActionTooltip>
  );
}

function StarAction({ bookmark, actions }: ToolbarProps) {
  return (
    <IconAction
      label={bookmark.starred ? "Unstar" : "Star"}
      keys={["S"]}
      onClick={actions.toggleStar}
      pressed={bookmark.starred}
      testId="star-button"
    >
      <Star
        className={cn(bookmark.starred && "fill-primary text-primary")}
      />
    </IconAction>
  );
}

function ReadAction({ bookmark, actions }: ToolbarProps) {
  if (!supportsReadState(bookmark.type)) return null;
  return (
    <IconAction
      label={bookmark.read ? "Mark as unread" : "Mark as read"}
      onClick={actions.toggleRead}
      pressed={bookmark.read}
      testId="read-button"
    >
      {bookmark.read ? (
        <BookOpenCheck className="text-primary" />
      ) : (
        <BookOpen />
      )}
    </IconAction>
  );
}

function CopyAction({ actions }: Pick<ToolbarProps, "actions">) {
  return (
    <IconAction
      label="Copy link"
      keys={["C"]}
      onClick={actions.copyLink}
      testId="copy-link-button"
    >
      {actions.isLinkCopied ? <Check /> : <Copy />}
    </IconAction>
  );
}

function ShareAction({ actions }: Pick<ToolbarProps, "actions">) {
  return (
    <IconAction
      label="Copy public link"
      onClick={actions.copyShareLink}
      testId="share-button"
    >
      {actions.isShareCopied ? <Check /> : <Share />}
    </IconAction>
  );
}

function MenuShortcut({ keys }: { keys: readonly string[] }) {
  return (
    <span className="ml-auto hidden pl-4 md:inline-flex">
      <ShortcutHint keys={keys} />
    </span>
  );
}

/**
 * Overflow menu. `includeQuickActions` folds star / read / copy / share in
 * for narrow toolbars (mobile header, side panel).
 */
export function BookmarkDetailMoreMenu({
  bookmark,
  actions,
  includeQuickActions = false,
  includeShare = false,
  className,
}: ToolbarProps & {
  includeQuickActions?: boolean;
  includeShare?: boolean;
  className?: string;
}) {
  const readerUrl = getReaderUrl(bookmark);
  const canRead = supportsReadState(bookmark.type);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="More actions"
          data-testid="bookmark-more-menu"
          className={cn(
            "text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {includeQuickActions ? (
          <>
            <DropdownMenuItem onClick={actions.toggleStar}>
              <Star
                className={cn(bookmark.starred && "fill-primary text-primary")}
              />
              {bookmark.starred ? "Unstar" : "Star"}
              <MenuShortcut keys={["S"]} />
            </DropdownMenuItem>
            {canRead ? (
              <DropdownMenuItem onClick={actions.toggleRead}>
                {bookmark.read ? <BookOpenCheck /> : <BookOpen />}
                {bookmark.read ? "Mark as unread" : "Mark as read"}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={actions.copyLink}>
              <Copy />
              Copy link
              <MenuShortcut keys={["C"]} />
            </DropdownMenuItem>
          </>
        ) : null}
        {includeQuickActions || includeShare ? (
          <DropdownMenuItem onClick={actions.copyShareLink}>
            <Share />
            Copy public link
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={actions.copyMarkdown}>
          <FileText />
          Copy as Markdown
        </DropdownMenuItem>
        {readerUrl ? (
          <DropdownMenuItem asChild>
            <a href={readerUrl} target="_blank" rel="noreferrer">
              <BookOpen />
              Open reader view
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to="/app/agents" search={{ q: getAskAiQuestion(bookmark) }}>
            <Sparkles />
            Ask AI about this
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={actions.reprocess}
          data-testid="rebookmark-button"
        >
          <RefreshCcw />
          Reprocess
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={actions.requestDelete}>
          <Trash2 />
          Delete
          <MenuShortcut keys={["mod", "D"]} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Full-page header actions. Collapses into the menu below md. */
export function BookmarkPageActions({ bookmark, actions }: ToolbarProps) {
  return (
    <>
      <div className="hidden items-center gap-0.5 md:flex">
        <StarAction bookmark={bookmark} actions={actions} />
        <ReadAction bookmark={bookmark} actions={actions} />
        <CopyAction actions={actions} />
        <ShareAction actions={actions} />
        <BookmarkDetailMoreMenu bookmark={bookmark} actions={actions} />
      </div>
      <BookmarkDetailMoreMenu
        bookmark={bookmark}
        actions={actions}
        includeQuickActions
        className="md:hidden"
      />
      <OpenOriginalButton bookmark={bookmark} actions={actions} compact />
    </>
  );
}

/** Side-panel header actions: tighter, share folds into the menu. */
export function BookmarkPanelActions({ bookmark, actions }: ToolbarProps) {
  return (
    <>
      <StarAction bookmark={bookmark} actions={actions} />
      <ReadAction bookmark={bookmark} actions={actions} />
      <CopyAction actions={actions} />
      <BookmarkDetailMoreMenu bookmark={bookmark} actions={actions} includeShare />
      <OpenOriginalButton bookmark={bookmark} actions={actions} />
    </>
  );
}
