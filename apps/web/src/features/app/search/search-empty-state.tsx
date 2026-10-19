import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { ChevronsDown, FilterX, SearchX, Sparkles } from "lucide-react";
import { nextMatchingDistance, useSearchFilters } from "./use-search-filters";

/** No-results state for a search or filtered view. Always offers a next step. */
export function SearchEmptyState({
  query,
  hasFilters,
}: {
  query: string;
  hasFilters: boolean;
}) {
  const { matchingDistance, setState, clearFilters } = useSearchFilters();
  const trimmed = query.trim();
  const broader = trimmed ? nextMatchingDistance(matchingDistance) : null;

  return (
    <div
      data-slot="search-empty-state"
      className="col-span-full mx-auto flex w-full max-w-lg flex-col items-center px-6 py-16 text-center"
    >
      <div className="mb-5 flex size-11 items-center justify-center rounded-full bg-muted ring-1 ring-foreground/6">
        <SearchX className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="font-serif text-2xl leading-tight tracking-tight text-foreground text-balance">
        {trimmed ? (
          <>Nothing matches “{trimmed}”</>
        ) : (
          "Nothing matches these filters"
        )}
      </h2>
      <p className="mt-2 text-[14px] text-muted-foreground text-pretty">
        {hasFilters
          ? "Your filters may be narrowing things too much. Try loosening them"
          : "Try different words or a broader search"}
        {trimmed ? ", or let AI dig through your library." : "."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3"
            onClick={() => void clearFilters()}
          >
            <FilterX className="size-3.5" aria-hidden="true" />
            Remove filters
          </Button>
        ) : null}
        {broader !== null ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3"
            onClick={() => void setState({ matchingDistance: broader })}
          >
            <ChevronsDown className="size-3.5" aria-hidden="true" />
            Show broader matches
          </Button>
        ) : null}
        {trimmed ? (
          <Button
            asChild
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3"
          >
            <Link to="/app/agents" search={{ q: trimmed }}>
              <Sparkles className="size-3.5" aria-hidden="true" />
              Ask AI instead
            </Link>
          </Button>
        ) : null}
        {!trimmed && !hasFilters ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-3"
          >
            <Link to="/app">Back to library</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
