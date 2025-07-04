import { inputVariants } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Plus, Search } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { BookmarkType } from "@workspace/database";
import { Tag } from "../hooks/use-tags";
import { parseMention, removeMention, MentionType } from "../utils/type-filter-utils";

interface MentionFilterInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  isUrl: boolean;
  onShowTypeList: (show: boolean) => void;
  onShowTagList: (show: boolean) => void;
  onTypeFilterChange: (filter: string) => void;
  onTagFilterChange: (filter: string) => void;
  onAddType: (type: BookmarkType) => void;
  onAddTag: (tagName: string) => void;
  filteredTypes: BookmarkType[];
  filteredTags: Tag[];
  onEnterPress: () => void;
}

export const MentionFilterInput = ({
  query,
  onQueryChange,
  isUrl,
  onShowTypeList,
  onShowTagList,
  onTypeFilterChange,
  onTagFilterChange,
  onAddType,
  onAddTag,
  filteredTypes,
  filteredTags,
  onEnterPress
}: MentionFilterInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart || 0;
    
    setCursorPosition(cursor);
    onQueryChange(value);

    const mention = parseMention(value, cursor);
    if (mention) {
      if (mention.type === "type") {
        onShowTypeList(true);
        onShowTagList(false);
        onTypeFilterChange(mention.mention);
        onTagFilterChange("");
      } else if (mention.type === "tag") {
        onShowTagList(true);
        onShowTypeList(false);
        onTagFilterChange(mention.mention);
        onTypeFilterChange("");
      }
    } else {
      onShowTypeList(false);
      onShowTagList(false);
      onTypeFilterChange("");
      onTagFilterChange("");
    }
  }, [onQueryChange, onShowTypeList, onShowTagList, onTypeFilterChange, onTagFilterChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const cursor = inputRef.current?.selectionStart || 0;
    const mention = parseMention(query, cursor);

    if (e.key === "Enter") {
      if (mention) {
        e.preventDefault();
        
        if (mention.type === "type" && filteredTypes.length > 0) {
          const selectedType = filteredTypes[0];
          if (selectedType) {
            onAddType(selectedType);
            
            const newQuery = removeMention(query, mention.startIndex, mention.endIndex);
            onQueryChange(newQuery);
            
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(mention.startIndex, mention.startIndex);
              }
            }, 0);
          }
        } else if (mention.type === "tag" && filteredTags.length > 0) {
          const selectedTag = filteredTags[0];
          if (selectedTag) {
            onAddTag(selectedTag.name);
            
            const newQuery = removeMention(query, mention.startIndex, mention.endIndex);
            onQueryChange(newQuery);
            
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(mention.startIndex, mention.startIndex);
              }
            }, 0);
          }
        }
      } else if (isUrl) {
        onEnterPress();
      }
    } else if (e.key === "Escape" && mention) {
      onShowTypeList(false);
      onShowTagList(false);
      onTypeFilterChange("");
      onTagFilterChange("");
    }
  }, [query, filteredTypes, filteredTags, onAddType, onAddTag, onQueryChange, isUrl, onEnterPress, onShowTypeList, onShowTagList, onTypeFilterChange, onTagFilterChange]);

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
        placeholder="Search bookmarks or type @ for types, # for tags"
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