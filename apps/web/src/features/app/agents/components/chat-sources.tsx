import { Link } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { GlobeIcon } from "lucide-react";
import { useState } from "react";
import {
  type ChatSource,
  getDomain,
  getSourceTitle,
} from "../chat-utils";

function sourceSearch(bookmarkId: string) {
  return (previous: Record<string, unknown>) =>
    ({ ...previous, b: bookmarkId }) as never;
}

function SourceFavicon({
  source,
  className,
}: {
  source: ChatSource;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!source.faviconUrl || failed) {
    return (
      <GlobeIcon
        className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
      />
    );
  }

  return (
    <img
      src={source.faviconUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("size-3.5 shrink-0 rounded-[3px]", className)}
    />
  );
}

function SourceThumb({ source }: { source: ChatSource }) {
  const image = source.ogImageUrl || source.preview;
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return (
      <div className="flex size-full items-center justify-center bg-muted">
        <SourceFavicon source={source} className="size-6 rounded-md" />
      </div>
    );
  }

  return (
    <img
      src={image}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-full object-cover transition-transform duration-200 ease-(--ease-out-soft) group-hover/source:scale-[1.02] motion-reduce:transition-none"
    />
  );
}

function SourceIndex({ index, className }: { index: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] bg-muted px-1 font-mono text-[10px] leading-none font-medium text-muted-foreground tabular-nums",
        className,
      )}
    >
      {index}
    </span>
  );
}

function SourcePreview({ source, index }: { source: ChatSource; index: number }) {
  const image = source.ogImageUrl || source.preview;
  const snippet = source.summary || source.ogDescription;

  return (
    <div className="flex flex-col gap-2">
      {image ? (
        <div className="aspect-[1.91/1] w-full overflow-hidden rounded-md bg-muted">
          <img src={image} alt="" className="size-full object-cover" />
        </div>
      ) : null}
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <SourceIndex index={index} />
        <SourceFavicon source={source} />
        <span className="truncate">{getDomain(source.url)}</span>
      </div>
      <p className="line-clamp-2 text-[13px] leading-snug font-medium text-foreground">
        {getSourceTitle(source)}
      </p>
      {snippet ? (
        <p className="line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
          {snippet}
        </p>
      ) : null}
    </div>
  );
}

/** Numbered pill with a hover/focus preview of the cited bookmark. */
export function CitationChip({
  source,
  index,
}: {
  source: ChatSource;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        if (next && details.reason === "trigger-press") return;
        setOpen(next);
      }}
    >
      <PopoverTrigger
        openOnHover
        delay={120}
        closeDelay={80}
        render={
          <Link
            to="/app/agents"
            search={sourceSearch(source.id)}
            resetScroll={false}
            onClick={() => setOpen(false)}
            aria-label={`Source ${index}: ${getSourceTitle(source)}`}
          />
        }
        className={cn(
          "group/chip inline-flex h-6 max-w-[220px] items-center gap-1.5 rounded-full bg-muted/70 py-0.5 pr-2.5 pl-1 text-[12px] text-muted-foreground outline-none transition-colors duration-150",
          "hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-popup-open:bg-muted data-popup-open:text-foreground",
        )}
      >
        <SourceIndex
          index={index}
          className="bg-background text-foreground/80 ring-1 ring-border"
        />
        <SourceFavicon source={source} className="size-3" />
        <span className="truncate">{getDomain(source.url)}</span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-72 rounded-[14px] p-3"
      >
        <SourcePreview source={source} index={index} />
      </PopoverContent>
    </Popover>
  );
}

export function SourceCard({
  source,
  index,
}: {
  source: ChatSource;
  index: number;
}) {
  return (
    <Link
      to="/app/agents"
      search={sourceSearch(source.id)}
      resetScroll={false}
      className={cn(
        "group/source flex min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border outline-none",
        "transition-[box-shadow,transform] duration-150 ease-(--ease-out-soft) hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/60",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border/60">
        <SourceThumb source={source} />
        <SourceIndex
          index={index}
          className="absolute top-2 left-2 bg-background/90 text-foreground shadow-xs ring-1 ring-border backdrop-blur"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5">
        <p className="line-clamp-2 text-[13px] leading-snug font-medium text-foreground">
          {getSourceTitle(source)}
        </p>
        <div className="mt-auto flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <SourceFavicon source={source} className="size-3" />
          <span className="truncate">{getDomain(source.url)}</span>
        </div>
      </div>
    </Link>
  );
}

export function SourceGrid({
  sources,
  title,
}: {
  sources: ChatSource[];
  title?: string | null;
}) {
  return (
    <section aria-label="Sources" className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2 text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground/80">
          {title || "Sources"}
        </span>
        <span className="tabular-nums">
          {sources.length} bookmark{sources.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {sources.map((source, index) => (
          <SourceCard key={source.id} source={source} index={index + 1} />
        ))}
      </div>
    </section>
  );
}
