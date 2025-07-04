import { inputVariants } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Plus, Search } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { BookmarkType } from "../hooks/use-type-filter";
import { parseAtMention, removeAtMention } from "../utils/type-filter-utils";

interface TypeFilterInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  isUrl: boolean;
  onShowTypeList: (show: boolean) => void;
  onTypeFilterChange: (filter: string) => void;
  onAddType: (type: BookmarkType) => void;
  filteredTypes: BookmarkType[];
  onEnterPress: () => void;
}

export const TypeFilterInput = ({
  query,
  onQueryChange,
  isUrl,
  onShowTypeList,
  onTypeFilterChange,
  onAddType,
  filteredTypes,
  onEnterPress
}: TypeFilterInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart || 0;
    
    setCursorPosition(cursor);
    onQueryChange(value);

    const atMention = parseAtMention(value, cursor);
    if (atMention) {
      onShowTypeList(true);
      onTypeFilterChange(atMention.mention);
    } else {
      onShowTypeList(false);
      onTypeFilterChange("");
    }
  }, [onQueryChange, onShowTypeList, onTypeFilterChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const cursor = inputRef.current?.selectionStart || 0;
    const atMention = parseAtMention(query, cursor);

    if (e.key === "Enter") {
      if (atMention && filteredTypes.length > 0) {
        e.preventDefault();
        const selectedType = filteredTypes[0];
        if (selectedType) {
          onAddType(selectedType);
        
          const newQuery = removeAtMention(query, atMention.startIndex, atMention.endIndex);
          onQueryChange(newQuery);
          
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              inputRef.current.setSelectionRange(atMention.startIndex, atMention.startIndex);
            }
          }, 0);
        }
      } else if (isUrl) {
        onEnterPress();
      }
    } else if (e.key === "Escape" && atMention) {
      onShowTypeList(false);
      onTypeFilterChange("");
    }
  }, [query, filteredTypes, onAddType, onQueryChange, isUrl, onEnterPress, onShowTypeList, onTypeFilterChange]);

  return (
    <div
      className={cn(
        inputVariants({}),
        "flex-1 flex items-center gap-2 relative lg:h-16 bg-background focus-within:ring-2 focus-within:ring-ring/50 lg:rounded-lg",
      )}
    >
      {isUrl ? (
        <Plus className="pointer-events-none" />
      ) : (
        <Search className="pointer-events-none" />
      )}
      <input
        ref={inputRef}
        value={query}
        className="lg:h-16 lg:text-2xl flex-1 focus:outline-none"
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Search bookmarks or type @ for filters"
        onSelect={(e) => {
          const target = e.target as HTMLInputElement;
          setCursorPosition(target.selectionStart || 0);
        }}
        onClick={(e) => {
          const target = e.target as HTMLInputElement;
          setCursorPosition(target.selectionStart || 0);
        }}
      />
    </div>
  );
};