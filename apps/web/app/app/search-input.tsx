"use client";

import { BookmarkType } from "@workspace/database";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Search } from "lucide-react";
import { useQueryState, useQueryStates } from "nuqs";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { TagMultiSelect } from "./components/tag-multi-select";
import { TypeMultiSelect } from "./components/type-multi-select";

export type SearchInputRef = {
  focus: () => void;
};

const BOOKMARK_TYPES: BookmarkType[] = Object.values(BookmarkType);

export const SearchInput = forwardRef<SearchInputRef>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useQueryState("query", {
    defaultValue: "",
  });

  const [urlState, setUrlState] = useQueryStates({
    types: {
      defaultValue: [] as BookmarkType[],
      serialize: (types) => types.join(","),
      parse: (str) =>
        str
          ? (str
              .split(",")
              .filter((type) =>
                BOOKMARK_TYPES.includes(type as BookmarkType),
              ) as BookmarkType[])
          : [],
    },
    tags: {
      defaultValue: [] as string[],
      serialize: (tags) => tags.join(","),
      parse: (str) => (str ? str.split(",").filter(Boolean) : []),
    },
  });

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-md flex-1 min-w-[200px]">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search bookmarks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn("h-10 pl-9")}
        />
      </div>
      <TagMultiSelect
        selectedTags={urlState.tags}
        onTagsChange={(tags) => setUrlState({ tags })}
      />
      <TypeMultiSelect
        selectedTypes={urlState.types}
        onTypesChange={(types) => setUrlState({ types })}
      />
    </div>
  );
});

SearchInput.displayName = "SearchInput";
