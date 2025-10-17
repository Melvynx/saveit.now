import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Plus, Search, X } from "lucide-react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useSearchInput } from "../contexts/search-input-context";
import { parseMention, removeMention } from "../utils/type-filter-utils";

interface MentionFilterInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  isUrl: boolean;
  onEnterPress: () => void;
}

export interface MentionFilterInputRef {
  focus: () => void;
}

// Helper function to handle cursor focus after mention selection
const focusCursor = (
  inputRef: React.RefObject<HTMLInputElement | null>,
  startIndex: number,
) => {
  setTimeout(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(startIndex, startIndex);
    }
  }, 0);
};

export const MentionFilterInput = forwardRef<
  MentionFilterInputRef,
  MentionFilterInputProps
>(({ query, onQueryChange, isUrl, onEnterPress }, ref) => {
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

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    },
  }));

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
            addTag(firstTag.name, query);
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
        const newQuery = removeMention(
          query,
          mention.startIndex,
          mention.endIndex,
        );
        onQueryChange(newQuery);
        focusCursor(inputRef, mention.startIndex);
        return true;
      }
      return false;
    },
    [
      query,
      filteredTypes,
      filteredTags,
      filteredSpecialFilters,
      addType,
      addTag,
      addSpecialFilter,
      onQueryChange,
    ],
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
    <InputGroup className="flex-1 lg:h-16 lg:rounded-xl">
      <InputGroupAddon>
        {isUrl ? (
          <Plus className="size-3 lg:size-6" />
        ) : (
          <Search className="size-3 lg:size-6" />
        )}
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        value={query}
        className=" lg:text-2xl"
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Search bookmarks or type @ for types, # for tags, $ for filters"
      />
      {query && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            className="size-3 lg:size-6"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
});

MentionFilterInput.displayName = "MentionFilterInput";
