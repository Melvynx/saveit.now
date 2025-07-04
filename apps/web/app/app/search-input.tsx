import { Button } from "@workspace/ui/components/button";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { URL_SCHEMA } from "./schema";
import { useCreateBookmarkAction } from "./use-create-bookmark";
import { useTypeFilter } from "./hooks/use-type-filter";
import { TypeFilterInput } from "./components/type-filter-input";
import { SelectedTypeBadges } from "./components/selected-type-badges";
import { TypeList } from "./components/type-list";

export const SearchInput = () => {
  const [query, setQuery] = useQueryState("query", {
    defaultValue: "",
  });

  const {
    selectedTypes,
    showTypeList,
    setShowTypeList,
    typeFilter,
    setTypeFilter,
    filteredTypes,
    addType,
    removeType
  } = useTypeFilter();

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
      <div className="flex items-center gap-2">
        <TypeFilterInput
          query={query}
          onQueryChange={setQuery}
          isUrl={isUrl}
          onShowTypeList={setShowTypeList}
          onTypeFilterChange={setTypeFilter}
          onAddType={addType}
          filteredTypes={filteredTypes}
          onEnterPress={handleEnterPress}
        />
        {isUrl ? (
          <Button
            onClick={() => {
              action.execute({ url: query });
            }}
            variant="outline"
            className="lg:h-16 lg:px-6 lg:py-4 lg:text-2xl"
          >
            Add
          </Button>
        ) : null}
      </div>
      
      <SelectedTypeBadges
        selectedTypes={selectedTypes}
        onRemoveType={removeType}
      />
      
      <TypeList
        filteredTypes={filteredTypes}
        onSelectType={addType}
        show={showTypeList}
      />
    </div>
  );
};
