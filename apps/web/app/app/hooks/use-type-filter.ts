import { useQueryState } from "nuqs";
import { useState, useCallback } from "react";
import { BookmarkType } from "@workspace/database";

export const BOOKMARK_TYPES: BookmarkType[] = Object.values(BookmarkType);

export const useTypeFilter = () => {
  const [selectedTypes, setSelectedTypes] = useQueryState("types", {
    defaultValue: [] as BookmarkType[],
    serialize: (types) => types.join(","),
    parse: (str) => str ? str.split(",").filter(type => 
      BOOKMARK_TYPES.includes(type as BookmarkType)
    ) as BookmarkType[] : []
  });

  const [showTypeList, setShowTypeList] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");

  const filteredTypes = BOOKMARK_TYPES.filter(type => 
    type.toLowerCase().includes(typeFilter.toLowerCase()) &&
    !selectedTypes.includes(type)
  );

  const addType = useCallback((type: BookmarkType) => {
    if (!selectedTypes.includes(type)) {
      setSelectedTypes([...selectedTypes, type]);
    }
    setShowTypeList(false);
    setTypeFilter("");
  }, [selectedTypes, setSelectedTypes]);

  const removeType = useCallback((type: BookmarkType) => {
    setSelectedTypes(selectedTypes.filter(t => t !== type));
  }, [selectedTypes, setSelectedTypes]);

  const clearTypes = useCallback(() => {
    setSelectedTypes([]);
  }, [setSelectedTypes]);

  return {
    selectedTypes,
    showTypeList,
    setShowTypeList,
    typeFilter,
    setTypeFilter,
    filteredTypes,
    addType,
    removeType,
    clearTypes
  };
};