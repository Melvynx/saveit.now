import { useQueryStates } from "nuqs";
import { useState, useCallback } from "react";
import { BookmarkType } from "@workspace/database";
import { useTags } from "./use-tags";

export type SpecialFilter = "READ" | "UNREAD" | "STAR";
export type MentionType = "type" | "tag" | "special";

export const BOOKMARK_TYPES: BookmarkType[] = Object.values(BookmarkType);
export const SPECIAL_FILTERS: SpecialFilter[] = ["READ", "UNREAD", "STAR"];

interface FilterUIState {
  showTypeList: boolean;
  showTagList: boolean;
  showSpecialList: boolean;
  typeFilter: string;
  tagFilter: string;
  specialFilter: string;
}

const initialUIState: FilterUIState = {
  showTypeList: false,
  showTagList: false,
  showSpecialList: false,
  typeFilter: "",
  tagFilter: "",
  specialFilter: "",
};

export const useUnifiedFilters = () => {
  // URL state with batching
  const [urlState, setUrlState] = useQueryStates({
    types: {
      defaultValue: [] as BookmarkType[],
      serialize: (types) => types.join(","),
      parse: (str) => str ? str.split(",").filter(type => 
        BOOKMARK_TYPES.includes(type as BookmarkType)
      ) as BookmarkType[] : []
    },
    special: {
      defaultValue: [] as SpecialFilter[],
      serialize: (filters) => filters.join(","),
      parse: (str) => str ? str.split(",").filter(filter => 
        SPECIAL_FILTERS.includes(filter as SpecialFilter)
      ) as SpecialFilter[] : []
    }
  });

  // Local UI state
  const [uiState, setUIState] = useState<FilterUIState>(initialUIState);

  // Tag management (using existing hook)
  const tagFilter = useTags();

  // Computed values
  const filteredTypes = BOOKMARK_TYPES.filter(type => 
    type.toLowerCase().includes(uiState.typeFilter.toLowerCase()) &&
    !urlState.types.includes(type)
  );

  const filteredSpecialFilters = SPECIAL_FILTERS.filter(filter => 
    filter.toLowerCase().includes(uiState.specialFilter.toLowerCase()) &&
    !urlState.special.includes(filter)
  );

  // Actions
  const showLists = useCallback((type: MentionType, filter: string) => {
    setUIState({
      showTypeList: type === "type",
      showTagList: type === "tag", 
      showSpecialList: type === "special",
      typeFilter: type === "type" ? filter : "",
      tagFilter: type === "tag" ? filter : "",
      specialFilter: type === "special" ? filter : "",
    });
  }, []);

  const hideLists = useCallback(() => {
    setUIState(initialUIState);
  }, []);

  const addType = useCallback((type: BookmarkType) => {
    if (!urlState.types.includes(type)) {
      setUrlState({ types: [...urlState.types, type] });
    }
    hideLists();
  }, [urlState.types, setUrlState, hideLists]);

  const removeType = useCallback((type: BookmarkType) => {
    setUrlState({ types: urlState.types.filter(t => t !== type) });
  }, [urlState.types, setUrlState]);

  const addSpecialFilter = useCallback((filter: SpecialFilter) => {
    if (!urlState.special.includes(filter)) {
      setUrlState({ special: [...urlState.special, filter] });
    }
    hideLists();
  }, [urlState.special, setUrlState, hideLists]);

  const removeSpecialFilter = useCallback((filter: SpecialFilter) => {
    setUrlState({ special: urlState.special.filter(f => f !== filter) });
  }, [urlState.special, setUrlState]);

  const clearTypes = useCallback(() => {
    setUrlState({ types: [] });
  }, [setUrlState]);

  const clearSpecialFilters = useCallback(() => {
    setUrlState({ special: [] });
  }, [setUrlState]);

  return {
    // Selected filters
    selectedTypes: urlState.types,
    selectedTags: tagFilter.selectedTags,
    selectedSpecialFilters: urlState.special,

    // UI state
    showTypeList: uiState.showTypeList,
    showTagList: uiState.showTagList,
    showSpecialList: uiState.showSpecialList,

    // Filter values
    typeFilter: uiState.typeFilter,
    tagFilter: uiState.tagFilter,
    specialFilter: uiState.specialFilter,

    // Filtered options
    filteredTypes,
    filteredTags: tagFilter.filteredTags,
    filteredSpecialFilters,

    // Actions
    showLists,
    hideLists,
    addType,
    removeType,
    addTag: tagFilter.addTag,
    removeTag: tagFilter.removeTag,
    addSpecialFilter,
    removeSpecialFilter,
    clearTypes,
    clearSpecialFilters,

    // Legacy setters for backward compatibility
    setShowTypeList: (show: boolean) => show ? showLists("type", uiState.typeFilter) : hideLists(),
    setShowTagList: (show: boolean) => show ? showLists("tag", uiState.tagFilter) : hideLists(),
    setShowSpecialList: (show: boolean) => show ? showLists("special", uiState.specialFilter) : hideLists(),
    setTypeFilter: (filter: string) => showLists("type", filter),
    setTagFilter: (filter: string) => showLists("tag", filter),
    setSpecialFilter: (filter: string) => showLists("special", filter),
  };
};