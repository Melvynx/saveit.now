import { useQueryState } from "nuqs";
import { useState, useCallback } from "react";

export type SpecialFilter = "READ" | "UNREAD" | "STAR";

export const SPECIAL_FILTERS: SpecialFilter[] = ["READ", "UNREAD", "STAR"];

export const useSpecialFilter = () => {
  const [selectedSpecialFilters, setSelectedSpecialFilters] = useQueryState("special", {
    defaultValue: [] as SpecialFilter[],
    serialize: (filters) => filters.join(","),
    parse: (str) => str ? str.split(",").filter(filter => 
      SPECIAL_FILTERS.includes(filter as SpecialFilter)
    ) as SpecialFilter[] : []
  });

  const [showSpecialList, setShowSpecialList] = useState(false);
  const [specialFilter, setSpecialFilter] = useState("");

  const filteredSpecialFilters = SPECIAL_FILTERS.filter(filter => 
    filter.toLowerCase().includes(specialFilter.toLowerCase()) &&
    !selectedSpecialFilters.includes(filter)
  );

  const addSpecialFilter = useCallback((filter: SpecialFilter) => {
    if (!selectedSpecialFilters.includes(filter)) {
      setSelectedSpecialFilters([...selectedSpecialFilters, filter]);
    }
    setShowSpecialList(false);
    setSpecialFilter("");
  }, [selectedSpecialFilters, setSelectedSpecialFilters]);

  const removeSpecialFilter = useCallback((filter: SpecialFilter) => {
    setSelectedSpecialFilters(selectedSpecialFilters.filter(f => f !== filter));
  }, [selectedSpecialFilters, setSelectedSpecialFilters]);

  const clearSpecialFilters = useCallback(() => {
    setSelectedSpecialFilters([]);
  }, [setSelectedSpecialFilters]);

  return {
    selectedSpecialFilters,
    showSpecialList,
    setShowSpecialList,
    specialFilter,
    setSpecialFilter,
    filteredSpecialFilters,
    addSpecialFilter,
    removeSpecialFilter,
    clearSpecialFilters
  };
};