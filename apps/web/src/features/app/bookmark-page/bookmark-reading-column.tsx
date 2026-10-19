"use client";

import { BookmarkFavicon } from "@/features/app/bookmark-favicon";
import { TranscriptViewer } from "@/features/bookmarks/transcript-viewer";
import { useSession } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { toUserFacingProcessingError } from "@convex/processing/detect";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation } from "convex/react";
import { AlertCircle, Sparkles } from "lucide-react";
import { BookmarkHeroPreview } from "./bookmark-hero-preview";
import {
  type BookmarkDetailMode,
  formatDetailDate,
  getDomain,
  getTypeLabel,
  isProcessing,
} from "./bookmark-detail-utils";
import { MetaLabel } from "./bookmark-meta-panel";
import { BookmarkNote } from "./bookmark-note";
import { BookmarkProcessingSteps } from "./bookmark-processing-steps";
import { EditableText } from "./editable-text";
import type { BookmarkDetailActions } from "./use-bookmark-detail-actions";

const GENERIC_FAILURE =
  "Something went wrong while saving this bookmark. Retry to process it again.";

function getProcessingProblem(
  bookmark: BookmarkDetailDTO,
): { message: string; details?: string } | null {
  const metadata = bookmark.metadata;
  if (bookmark.status === "ERROR") {
    const message = toUserFacingProcessingError(
      bookmark.processingError ||
        (typeof metadata?.error === "string" ? metadata.error : undefined),
    );
    // Raw pipeline errors (JSON blobs, stack-like text) are not user copy.
    const isRaw = /^[[{]/.test(message.trim()) || message.length > 180;
    return isRaw
      ? { message: GENERIC_FAILURE, details: message }
      : { message };
  }
  if (
    bookmark.status === "READY" &&
    metadata?.fetchFailed === true &&
    !bookmark.summary
  ) {
    return {
      message: "We couldn't read this page, so it has no summary or tags yet.",
    };
  }
  return null;
}

function ProductFacts({ bookmark }: { bookmark: BookmarkDetailDTO }) {
  const metadata = bookmark.metadata;
  if (bookmark.type !== "PRODUCT" || !metadata) return null;
  const facts: [string, string][] = [];
  if (typeof metadata.brand === "string") facts.push(["Brand", metadata.brand]);
  if (metadata.price !== undefined && metadata.price !== null) {
    const currency =
      typeof metadata.currency === "string" ? metadata.currency : "USD";
    facts.push(["Price", `${currency} ${String(metadata.price)}`]);
  }
  if (facts.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <MetaLabel>Product</MetaLabel>
      <dl className="flex flex-wrap gap-2">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline gap-2 rounded-lg bg-muted/60 px-3 py-2 ring-1 ring-foreground/5"
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium text-foreground tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SummaryBlock({
  bookmark,
  editable,
  onReprocess,
}: {
  bookmark: BookmarkDetailDTO;
  editable: boolean;
  onReprocess: () => void;
}) {
  const updateBookmark = useMutation(api.bookmarks.mutations.update);

  if (isProcessing(bookmark.status)) return null;
  if (bookmark.status === "ERROR" && !bookmark.summary) return null;

  return (
    <section
      aria-label="Summary"
      className="flex flex-col gap-2 border-l-2 border-primary/35 pl-4"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        Summary
      </div>
      {bookmark.summary || editable ? (
        <EditableText
          value={bookmark.summary}
          displayValue={bookmark.summary || "Add a summary…"}
          variant="muted"
          className={cn(
            "font-serif text-[17px] leading-[1.6] text-foreground/90",
            !bookmark.summary && "text-muted-foreground italic",
          )}
          onSave={async (summary) => {
            await updateBookmark({ id: bookmark._id, patch: { summary } });
          }}
          commitOnEnter={false}
          allowEmpty
          ariaLabel="Bookmark summary"
          disabled={!editable}
          maxLength={5000}
        />
      ) : null}
      {!bookmark.summary && bookmark.status === "READY" ? (
        <Button
          variant="link"
          size="sm"
          className="h-auto self-start p-0 text-[13px]"
          onClick={onReprocess}
        >
          Generate it again
        </Button>
      ) : null}
    </section>
  );
}

function EmbeddedTextBlock({ bookmark }: { bookmark: BookmarkDetailDTO }) {
  const session = useSession();
  const isAdmin =
    (session.data?.user as { role?: string } | undefined)?.role === "admin";
  if (!isAdmin) return null;
  const text = [
    bookmark.title?.trim(),
    bookmark.vectorSummary?.trim() || bookmark.summary?.trim(),
  ]
    .filter(Boolean)
    .join("\n");
  if (!text) return null;

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4">
      <MetaLabel>Embedded text · admin only</MetaLabel>
      <pre className="max-h-72 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {text}
      </pre>
    </section>
  );
}

export function BookmarkReadingColumn({
  bookmark,
  actions,
  mode,
  className,
}: {
  bookmark: BookmarkDetailDTO;
  actions: BookmarkDetailActions;
  mode: BookmarkDetailMode;
  className?: string;
}) {
  const updateBookmark = useMutation(api.bookmarks.mutations.update);
  const busy = isProcessing(bookmark.status);
  const problem = getProcessingProblem(bookmark);
  const transcript = bookmark.metadata?.transcript;
  const domain = getDomain(bookmark.url);

  return (
    <article className={cn("flex min-w-0 flex-col gap-8", className)}>
      <BookmarkHeroPreview bookmark={bookmark} />

      <header className="flex flex-col gap-3">
        <EditableText
          value={bookmark.title}
          displayValue={bookmark.title || domain}
          variant="large"
          className={cn(
            "font-serif font-medium tracking-[-0.01em] text-foreground",
            bookmark.type === "TWEET"
              ? "text-[20px] leading-[1.3]"
              : mode === "page"
                ? "text-[26px] leading-[1.2] md:text-[32px] md:leading-[1.15]"
                : "text-[24px] leading-[1.2]",
          )}
          onSave={async (title) => {
            await updateBookmark({ id: bookmark._id, patch: { title } });
          }}
          commitOnEnter
          allowEmpty={false}
          ariaLabel="Bookmark title"
          disabled={busy}
          maxLength={500}
        />
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              event.preventDefault();
              actions.openOriginal();
            }}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-sm text-foreground/80 underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="flex size-4 shrink-0 items-center justify-center">
              <BookmarkFavicon
                faviconUrl={bookmark.faviconUrl}
                bookmarkType={bookmark.type ?? "PAGE"}
              />
            </span>
            <span className="truncate">{domain}</span>
          </a>
          <span aria-hidden="true">·</span>
          <span>{getTypeLabel(bookmark.type)}</span>
          <span aria-hidden="true">·</span>
          <span>Saved {formatDetailDate(bookmark.createdAt)}</span>
        </div>
      </header>

      {busy ? <BookmarkProcessingSteps bookmark={bookmark} /> : null}

      {problem ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl bg-destructive/5 p-4 ring-1 ring-destructive/20"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="text-[13px] text-foreground">{problem.message}</p>
            {problem.details ? (
              <details className="group/details text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none hover:text-foreground">
                  Details
                </summary>
                <pre className="mt-1.5 max-h-32 overflow-auto font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap">
                  {problem.details}
                </pre>
              </details>
            ) : null}
          </div>
          <Button size="sm" variant="outline" onClick={actions.reprocess}>
            Retry
          </Button>
        </div>
      ) : null}

      <SummaryBlock
        bookmark={bookmark}
        editable={!busy}
        onReprocess={actions.reprocess}
      />

      <ProductFacts bookmark={bookmark} />

      {bookmark.type === "YOUTUBE" && typeof transcript === "string" ? (
        <TranscriptViewer transcript={transcript} />
      ) : null}

      <BookmarkNote
        note={bookmark.note}
        bookmarkId={bookmark.id}
        variant="plain"
      />

      <EmbeddedTextBlock bookmark={bookmark} />
    </article>
  );
}
