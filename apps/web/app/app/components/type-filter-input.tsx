import { inputVariants } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Plus, Search } from "lucide-react";
import { useCallback, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useSearchInput } from "../contexts/search-input-context";
import { parseMention, removeMention } from "../utils/type-filter-utils";

interface MentionFilterInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  isUrl: boolean;
  onEnterPress: () => void;
}

// Helper function to handle cursor focus after mention selection
const focusCursor = (inputRef: React.RefObject<HTMLInputElement | null>, startIndex: number) => {
  setTimeout(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(startIndex, startIndex);
    }
  }, 0);
};

export const MentionFilterInput = ({ query, onQueryChange, isUrl, onEnterPress }: MentionFilterInputProps) => {
  const {
    showLists,
    hideLists,
    addType,
    addTag,
    addSpecialFilter,
    filteredTypes,
    filteredTags,
    filteredSpecialFilters,
  } = useSearchInput();
  const inputRef = useRef<HTMLInputElement>(null);

  useHotkeys("mod+k", (event) => {
    event.preventDefault();
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const cursor = e.target.selectionStart || 0;

      onQueryChange(value);

      const mention = parseMention(value, cursor);
      if (mention) {
        showLists(mention.type, mention.mention);
      } else {
        hideLists();
      }
    },
    [onQueryChange, showLists, hideLists],
  );

  // Helper function to handle mention selection
  const handleMentionSelection = useCallback(
    (mention: ReturnType<typeof parseMention>) => {
      if (!mention) return false;

      const actions = {
        type: () => {
          const firstType = filteredTypes[0];
          if (firstType) {
            addType(firstType);
            return true;
          }
          return false;
        },
        tag: () => {
          const firstTag = filteredTags[0];
          if (firstTag) {
            addTag(firstTag.name);
            return true;
          }
          return false;
        },
        special: () => {
          const firstFilter = filteredSpecialFilters[0];
          if (firstFilter) {
            addSpecialFilter(firstFilter, query);
            return true;
          }
          return false;
        },
      };

      const action = actions[mention.type];
      if (action?.()) {
        const newQuery = removeMention(query, mention.startIndex, mention.endIndex);
        onQueryChange(newQuery);
        focusCursor(inputRef, mention.startIndex);
        return true;
      }
      return false;
    },
    [query, filteredTypes, filteredTags, filteredSpecialFilters, addType, addTag, addSpecialFilter, onQueryChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const cursor = inputRef.current?.selectionStart || 0;
      const mention = parseMention(query, cursor);

      if (e.key === "Enter") {
        if (mention) {
          e.preventDefault();
          handleMentionSelection(mention);
        } else if (isUrl) {
          onEnterPress();
        }
      } else if (e.key === "Escape" && mention) {
        hideLists();
      }
    },
    [query, handleMentionSelection, isUrl, onEnterPress, hideLists],
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
        placeholder="Search bookmarks or type @ for types, # for tags, $ for filters"
      />
    </div>
  );
};
