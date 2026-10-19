import { Button } from "@workspace/ui/components/button";
import { ChevronsDown } from "lucide-react";
import { nextMatchingDistance, useSearchFilters } from "./use-search-filters";

/**
 * Subtle "Show broader matches" action shown after search results. Widens the
 * score spread (`?matchingDistance`) one step; hidden once everything is shown.
 */
export function BroadenMatchesButton() {
  const { query, matchingDistance, setState } = useSearchFilters();
  const next = nextMatchingDistance(matchingDistance);

  if (!query.trim() || next === null) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 px-2.5 text-[13px] font-normal text-muted-foreground hover:text-foreground"
      onClick={() => void setState({ matchingDistance: next })}
    >
      <ChevronsDown className="size-3.5" aria-hidden="true" />
      Show broader matches
    </Button>
  );
}
