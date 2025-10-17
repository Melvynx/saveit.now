import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { useQueryState } from "nuqs";
import { forwardRef } from "react";
import { toast } from "sonner";
import { FilterList } from "./components/filter-list";
import { SelectedFiltersBadges } from "./components/selected-filters-badges";
import {
  MentionFilterInput,
  MentionFilterInputRef,
} from "./components/type-filter-input";

import { SearchInputProvider } from "./contexts/search-input-context";
import { URL_SCHEMA } from "./schema";
import { useCreateBookmarkAction } from "./use-create-bookmark";

const SearchInputContent = forwardRef<
  MentionFilterInputRef,
  { query: string; setQuery: (query: string) => void }
>(({ query, setQuery }, ref) => {
  // No need to destructure context values here since components access them directly

  const isUrl = URL_SCHEMA.safeParse(query).success;

  const action = useCreateBookmarkAction({
    onSuccess: () => {
      toast.success("Bookmark added");
      setQuery("");
    },
  });

  const handleEnterPress = () => {
    if (isUrl) {
      action.execute({ url: query });
    }
  };

  return (
    <div className="space-y-2">
      <ButtonGroup className="w-full">
        <MentionFilterInput
          ref={ref}
          query={query}
          onQueryChange={setQuery}
          isUrl={isUrl}
          onEnterPress={handleEnterPress}
        />
        {isUrl ? (
          <Button
            onClick={() => {
              action.execute({ url: query });
            }}
            variant="outline"
            className="lg:h-16 lg:px-6 lg:py-4 lg:text-2xl lg:rounded-xl"
          >
            Add
          </Button>
        ) : null}
      </ButtonGroup>

      <SelectedFiltersBadges />

      <FilterList query={query} />
    </div>
  );
});

SearchInputContent.displayName = "SearchInputContent";

export const SearchInput = forwardRef<MentionFilterInputRef>((props, ref) => {
  const [query, setQuery] = useQueryState("query", {
    defaultValue: "",
  });

  return (
    <SearchInputProvider onInputChange={setQuery}>
      <SearchInputContent ref={ref} query={query} setQuery={setQuery} />
    </SearchInputProvider>
  );
});

SearchInput.displayName = "SearchInput";
