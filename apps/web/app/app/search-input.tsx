import { Button } from "@workspace/ui/components/button";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { FilterList } from "./components/filter-list";
import { SelectedFiltersBadges } from "./components/selected-filters-badges";
import { MentionFilterInput } from "./components/type-filter-input";
import { useTags } from "./hooks/use-tags";
import { useTypeFilter } from "./hooks/use-type-filter";
import { URL_SCHEMA } from "./schema";
import { useCreateBookmarkAction } from "./use-create-bookmark";

export const SearchInput = () => {
  const [query, setQuery] = useQueryState("query", {
    defaultValue: "",
  });

  const {
    selectedTypes,
    showTypeList,
    setShowTypeList,
    setTypeFilter,
    filteredTypes,
    addType,
    removeType,
  } = useTypeFilter();

  const {
    selectedTags,
    showTagList,
    setShowTagList,
    setTagFilter,
    filteredTags,
    addTag,
    removeTag,
  } = useTags();

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
        <MentionFilterInput
          query={query}
          onQueryChange={setQuery}
          isUrl={isUrl}
          onShowTypeList={setShowTypeList}
          onShowTagList={setShowTagList}
          onTypeFilterChange={setTypeFilter}
          onTagFilterChange={setTagFilter}
          onAddType={addType}
          onAddTag={addTag}
          filteredTypes={filteredTypes}
          filteredTags={filteredTags}
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

      <SelectedFiltersBadges
        selectedTypes={selectedTypes}
        selectedTags={selectedTags}
        onRemoveType={removeType}
        onRemoveTag={removeTag}
      />

      <FilterList
        filteredTypes={filteredTypes}
        filteredTags={filteredTags}
        onSelectType={addType}
        onSelectTag={addTag}
        showTypes={showTypeList}
        showTags={showTagList}
      />
    </div>
  );
};
