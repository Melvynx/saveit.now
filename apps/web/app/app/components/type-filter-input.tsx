import { inputVariants } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Plus, Search } from "lucide-react";
import { useCallback, useRef } from "react";
import { useSearchInput } from "../contexts/search-input-context";
import { parseMention, removeMention } from "../utils/type-filter-utils";

interface MentionFilterInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  isUrl: boolean;
  onEnterPress: () => void;
}

export const MentionFilterInput = ({
  query,
  onQueryChange,
  isUrl,
  onEnterPress,
}: MentionFilterInputProps) => {
  const {
    setShowTypeList,
    setShowTagList,
    setTypeFilter,
    setTagFilter,
    addType,
    addTag,
    filteredTypes,
    filteredTags,
  } = useSearchInput();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const cursor = e.target.selectionStart || 0;

      onQueryChange(value);

      const mention = parseMention(value, cursor);
      if (mention) {
        if (mention.type === "type") {
          setShowTypeList(true);
          setShowTagList(false);
          setTypeFilter(mention.mention);
          setTagFilter("");
        } else if (mention.type === "tag") {
          setShowTagList(true);
          setShowTypeList(false);
          setTagFilter(mention.mention);
          setTypeFilter("");
        }
      } else {
        setShowTypeList(false);
        setShowTagList(false);
        setTypeFilter("");
        setTagFilter("");
      }
    },
    [
      onQueryChange,
      setShowTypeList,
      setShowTagList,
      setTypeFilter,
      setTagFilter,
    ],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const cursor = inputRef.current?.selectionStart || 0;
      const mention = parseMention(query, cursor);

      if (e.key === "Enter") {
        if (mention) {
          e.preventDefault();

          if (mention.type === "type" && filteredTypes.length > 0) {
            const selectedType = filteredTypes[0];
            if (selectedType) {
              addType(selectedType);

              const newQuery = removeMention(
                query,
                mention.startIndex,
                mention.endIndex,
              );
              onQueryChange(newQuery);

              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                  inputRef.current.setSelectionRange(
                    mention.startIndex,
                    mention.startIndex,
                  );
                }
              }, 0);
            }
          } else if (mention.type === "tag" && filteredTags.length > 0) {
            const selectedTag = filteredTags[0];
            if (selectedTag) {
              addTag(selectedTag.name);

              const newQuery = removeMention(
                query,
                mention.startIndex,
                mention.endIndex,
              );
              onQueryChange(newQuery);

              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                  inputRef.current.setSelectionRange(
                    mention.startIndex,
                    mention.startIndex,
                  );
                }
              }, 0);
            }
          }
        } else if (isUrl) {
          onEnterPress();
        }
      } else if (e.key === "Escape" && mention) {
        setShowTypeList(false);
        setShowTagList(false);
        setTypeFilter("");
        setTagFilter("");
      }
    },
    [
      query,
      filteredTypes,
      filteredTags,
      addType,
      addTag,
      onQueryChange,
      isUrl,
      onEnterPress,
      setShowTypeList,
      setShowTagList,
      setTypeFilter,
      setTagFilter,
    ],
  );

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
      />
    </div>
  );
};
