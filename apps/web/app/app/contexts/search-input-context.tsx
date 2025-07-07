"use client";

import { BookmarkType } from "@workspace/database";
import { createContext, useContext, ReactNode } from "react";
import { useTypeFilter } from "../hooks/use-type-filter";
import { useTags, Tag } from "../hooks/use-tags";
import { useSpecialFilter, SpecialFilter } from "../hooks/use-special-filter";

interface SearchInputContextType {
  // Type filtering
  selectedTypes: BookmarkType[];
  showTypeList: boolean;
  setShowTypeList: (show: boolean) => void;
  setTypeFilter: (filter: string) => void;
  filteredTypes: BookmarkType[];
  addType: (type: BookmarkType) => void;
  removeType: (type: BookmarkType) => void;
  
  // Tag filtering
  selectedTags: string[];
  showTagList: boolean;
  setShowTagList: (show: boolean) => void;
  setTagFilter: (filter: string) => void;
  filteredTags: Tag[];
  addTag: (tagName: string) => void;
  removeTag: (tagName: string) => void;
  
  // Special filtering
  selectedSpecialFilters: SpecialFilter[];
  showSpecialList: boolean;
  setShowSpecialList: (show: boolean) => void;
  setSpecialFilter: (filter: string) => void;
  filteredSpecialFilters: SpecialFilter[];
  addSpecialFilter: (filter: SpecialFilter) => void;
  removeSpecialFilter: (filter: SpecialFilter) => void;
}

const SearchInputContext = createContext<SearchInputContextType | null>(null);

export const useSearchInput = () => {
  const context = useContext(SearchInputContext);
  if (!context) {
    throw new Error("useSearchInput must be used within SearchInputProvider");
  }
  return context;
};

interface SearchInputProviderProps {
  children: ReactNode;
}

export const SearchInputProvider = ({ children }: SearchInputProviderProps) => {
  const typeFilter = useTypeFilter();
  const tagFilter = useTags();
  const specialFilter = useSpecialFilter();

  const value: SearchInputContextType = {
    // Type filtering
    selectedTypes: typeFilter.selectedTypes,
    showTypeList: typeFilter.showTypeList,
    setShowTypeList: typeFilter.setShowTypeList,
    setTypeFilter: typeFilter.setTypeFilter,
    filteredTypes: typeFilter.filteredTypes,
    addType: typeFilter.addType,
    removeType: typeFilter.removeType,
    
    // Tag filtering
    selectedTags: tagFilter.selectedTags,
    showTagList: tagFilter.showTagList,
    setShowTagList: tagFilter.setShowTagList,
    setTagFilter: tagFilter.setTagFilter,
    filteredTags: tagFilter.filteredTags,
    addTag: tagFilter.addTag,
    removeTag: tagFilter.removeTag,
    
    // Special filtering
    selectedSpecialFilters: specialFilter.selectedSpecialFilters,
    showSpecialList: specialFilter.showSpecialList,
    setShowSpecialList: specialFilter.setShowSpecialList,
    setSpecialFilter: specialFilter.setSpecialFilter,
    filteredSpecialFilters: specialFilter.filteredSpecialFilters,
    addSpecialFilter: specialFilter.addSpecialFilter,
    removeSpecialFilter: specialFilter.removeSpecialFilter,
  };

  return (
    <SearchInputContext.Provider value={value}>
      {children}
    </SearchInputContext.Provider>
  );
};