"use client";

import { BookmarkType } from "@workspace/database";
import { createContext, useContext, ReactNode } from "react";
import { useUnifiedFilters, SpecialFilter, MentionType } from "../hooks/use-unified-filters";
import { Tag } from "../hooks/use-tags";

interface SearchInputContextType {
  // Selected filters
  selectedTypes: BookmarkType[];
  selectedTags: string[];
  selectedSpecialFilters: SpecialFilter[];

  // UI state
  showTypeList: boolean;
  showTagList: boolean;
  showSpecialList: boolean;

  // Filter values
  typeFilter: string;
  tagFilter: string;
  specialFilter: string;

  // Filtered options
  filteredTypes: BookmarkType[];
  filteredTags: Tag[];
  filteredSpecialFilters: SpecialFilter[];

  // Error and loading states
  isLoading: boolean;
  error: Error | null;
  retryFetch: () => void;

  // Actions
  showLists: (type: MentionType, filter: string) => void;
  hideLists: () => void;
  addType: (type: BookmarkType) => void;
  removeType: (type: BookmarkType) => void;
  addTag: (tagName: string, inputQuery?: string) => void;
  removeTag: (tagName: string) => void;
  addSpecialFilter: (filter: SpecialFilter, inputQuery?: string) => void;
  removeSpecialFilter: (filter: SpecialFilter) => void;

  // Legacy setters for backward compatibility
  setShowTypeList: (show: boolean) => void;
  setShowTagList: (show: boolean) => void;
  setShowSpecialList: (show: boolean) => void;
  setTypeFilter: (filter: string) => void;
  setTagFilter: (filter: string) => void;
  setSpecialFilter: (filter: string) => void;
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
  onInputChange?: (query: string) => void;
}

export const SearchInputProvider = ({ children, onInputChange }: SearchInputProviderProps) => {
  const filters = useUnifiedFilters(onInputChange);

  const value: SearchInputContextType = {
    // Direct mapping from unified filters
    ...filters,
  };

  return (
    <SearchInputContext.Provider value={value}>
      {children}
    </SearchInputContext.Provider>
  );
};