import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Loader2, Sparkles } from "lucide-react";

const countFormatter = new Intl.NumberFormat("en-US");

/** "12 results for "react"" line above search results, with an Ask AI escape hatch. */
export function SearchResultsHeader({
  count,
  query,
  isLoading,
  hasMore,
}: {
  count: number;
  query: string;
  isLoading?: boolean;
  hasMore?: boolean;
}) {
  const trimmed = query.trim();

  // SearchEmptyState already names the query when nothing matched.
  if (!isLoading && count === 0) return null;

  return (
    <div
      data-slot="search-results-header"
      className="flex min-h-9 w-full items-center justify-between gap-3"
    >
      <p
        className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground"
        aria-live="polite"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            <span className="truncate">
              Searching{trimmed ? ` for “${trimmed}”` : ""}…
            </span>
          </>
        ) : (
          <span className="truncate">
            <span className="font-medium text-foreground tabular-nums">
              {countFormatter.format(count)}
              {hasMore ? "+" : ""}
            </span>{" "}
            {count === 1 && !hasMore ? "result" : "results"}
            {trimmed ? (
              <>
                {" "}
                for{" "}
                <span className="font-medium text-foreground">“{trimmed}”</span>
              </>
            ) : null}
          </span>
        )}
      </p>
      {trimmed ? (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 shrink-0 gap-1.5 rounded-full px-3 text-[13px] text-primary hover:bg-primary/10 hover:text-primary",
          )}
        >
          <Link to="/app/agents" search={{ q: trimmed }}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            Ask AI
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
