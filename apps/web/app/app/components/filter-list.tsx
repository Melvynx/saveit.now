import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useSearchInput } from "../contexts/search-input-context";
import {
  getSpecialFilterColor,
  getSpecialFilterDisplayName,
  getTypeColor,
  getTypeDisplayName,
} from "../utils/type-filter-utils";

export const FilterList = ({ query }: { query?: string }) => {
  const {
    filteredTypes,
    filteredTags,
    filteredSpecialFilters,
    addType,
    addTag,
    addSpecialFilter,
    showTypeList,
    showTagList,
    showSpecialList,
    isLoading,
    error,
    retryFetch,
  } = useSearchInput();

  const hasItems =
    (showTypeList && filteredTypes.length > 0) ||
    (showTagList && (filteredTags.length > 0 || error || isLoading)) ||
    (showSpecialList && filteredSpecialFilters.length > 0);

  if (!hasItems) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Type badges with colors */}
      {showTypeList &&
        filteredTypes.map((type) => {
          if (type === "VIDEO") return null;
          return (
            <Badge
              key={`type-${type}`}
              variant="outline"
              className={`${getTypeColor(type)} cursor-pointer transition-colors`}
              onClick={() => addType(type)}
            >
              {getTypeDisplayName(type)}
            </Badge>
          );
        })}

      {/* Tag badges without colors */}
      {showTagList && (
        <>
          {error && (
            <div className="flex items-center gap-2 p-2 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load tags</span>
              <Button
                variant="outline"
                size="sm"
                onClick={retryFetch}
                className="ml-auto h-6 px-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
          {isLoading && (
            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading tags...</span>
            </div>
          )}
          {!error &&
            !isLoading &&
            filteredTags.map((tag) => (
              <Badge
                key={`tag-${tag.id}`}
                variant="outline"
                className="cursor-pointer transition-colors hover:bg-accent"
                onClick={() => addTag(tag.name, query)}
              >
                #{tag.name}
              </Badge>
            ))}
        </>
      )}

      {/* Special filter badges with colors */}
      {showSpecialList &&
        filteredSpecialFilters.map((filter) => (
          <Badge
            key={`special-${filter}`}
            variant="outline"
            className={`${getSpecialFilterColor(filter)} cursor-pointer transition-colors`}
            onClick={() => addSpecialFilter(filter, query)}
          >
            {getSpecialFilterDisplayName(filter)}
          </Badge>
        ))}
    </div>
  );
};
