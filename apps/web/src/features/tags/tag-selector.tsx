"use client";

import { AnimateChangeInHeight } from "@/components/animate-change-in-height";
import { useDebounceFn } from "@/hooks/use-debounce-fn";
import { TagType } from "@workspace/database";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import { Bot, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCreateTagMutation } from "./use-tags";
import { useInfiniteTags, type Tag as InfiniteTag } from "../../../app/app/hooks/use-tags";


type TagSelectorProps = {
  selectedTags?: { name: string; type: TagType; id: string }[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  showLimits?: number;
};

export function TagSelector({
  selectedTags = [],
  onTagsChange,
  disabled,
  placeholder = "Add tags...",
  showLimits,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);

  const debouncedSetQuery = useDebounceFn((value: string) => {
    setDebouncedQuery(value);
  }, 300);

  useEffect(() => {
    debouncedSetQuery(searchQuery);
  }, [searchQuery, debouncedSetQuery]);

  const {
    allTags,
    filteredTags: availableTags,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: tagsLoading,
  } = useInfiniteTags(debouncedQuery);
  const createTagMutation = useCreateTagMutation({});

  // Filter out duplicates (in case the same tag appears in multiple pages)
  const uniqueTags = Array.from(
    new Map(allTags.map((tag: InfiniteTag) => [tag.id, tag])).values(),
  );

  // Create selected tag objects - include all selected tags, even if not fetched yet
  const selectedTagObjects = selectedTags.map((selectedTag) => {
    const tagName = typeof selectedTag === "string" ? selectedTag : selectedTag.name;
    const tagType = typeof selectedTag === "string" ? "USER" : selectedTag.type;
    const tagId = typeof selectedTag === "string" ? tagName : selectedTag.id;
    
    // Try to find the tag in fetched data first
    const fetchedTag = uniqueTags.find(tag => tag.name === tagName);
    
    // If found in fetched data, use that; otherwise create a minimal object
    return fetchedTag || {
      id: tagId,
      name: tagName,
      type: tagType as TagType,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "",
    };
  });

  // Filter available tags to exclude selected ones
  const filteredNonSelectedTags = availableTags.filter((tag) =>
    !selectedTags.some((selectedTag) =>
      typeof selectedTag === "string"
        ? selectedTag === tag.name
        : selectedTag.name === tag.name,
    ),
  );

  const handleTagSelect = (tagName: string) => {
    console.log("handleTagSelect called with:", tagName);
    console.log("Current selectedTags:", selectedTags);

    const isSelected = selectedTags.some((selectedTag) =>
      typeof selectedTag === "string"
        ? selectedTag === tagName
        : selectedTag.name === tagName,
    );

    console.log("isSelected:", isSelected);

    const newTagNames = isSelected
      ? selectedTags
          .filter((t) =>
            typeof t === "string" ? t !== tagName : t.name !== tagName,
          )
          .map((t) => (typeof t === "string" ? t : t.name))
      : [
          ...selectedTags.map((t) => (typeof t === "string" ? t : t.name)),
          tagName,
        ];

    console.log("newTagNames:", newTagNames);
    onTagsChange(newTagNames);
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim()) return;

    try {
      // Create the tag
      await createTagMutation.mutateAsync(searchQuery.trim());

      // Add it to selected tags
      const newTagNames = [
        ...selectedTags.map((t) => (typeof t === "string" ? t : t.name)),
        searchQuery.trim(),
      ];
      onTagsChange(newTagNames);

      // Clear the search
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTagNames = selectedTags
      .filter((t) => (typeof t === "string" ? t !== tag : t.name !== tag))
      .map((t) => (typeof t === "string" ? t : t.name));
    onTagsChange(newTagNames);
  };

  // Determine what to display in the trigger
  const renderTagsDisplay = () => {
    if (selectedTags.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    const visibleCount = showLimits || selectedTags.length;

    if (selectedTags.length <= visibleCount) {
      return selectedTags.map((tag) => {
        const tagName = typeof tag === "string" ? tag : tag.name;
        const tagType = typeof tag === "string" ? "USER" : tag.type;
        const isAIGenerated = tagType === "IA";

        return (
          <Badge
            key={tagName}
            variant="outline"
            className={cn(
              "flex items-center gap-1 pr-1",
              isAIGenerated && "border-blue-500",
            )}
          >
            {isAIGenerated && <Bot className="size-3" />}
            <span>{tagName}</span>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-accent size-4 rounded-full p-0 transition"
              onClick={(e) => handleRemoveTag(tagName, e)}
              disabled={disabled}
            >
              <X className="size-3" />
            </Button>
          </Badge>
        );
      });
    }

    // If more tags than visible count, show first N and a count
    return (
      <>
        {selectedTags.slice(0, visibleCount).map((tag) => {
          const tagName = typeof tag === "string" ? tag : tag.name;
          const tagType = typeof tag === "string" ? "USER" : tag.type;
          const isAIGenerated = tagType === "IA";

          return (
            <Badge
              key={tagName}
              variant="outline"
              className={cn(
                "flex items-center gap-1 pr-1",
                isAIGenerated && "border-blue-500",
              )}
            >
              {isAIGenerated && <Bot className="size-3" />}
              <span>{tagName}</span>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent size-4 rounded-full p-0 transition"
                onClick={(e) => handleRemoveTag(tagName, e)}
                disabled={disabled}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          );
        })}
        <Badge variant="outline" className="bg-muted">
          +{selectedTags.length - visibleCount} more
        </Badge>
      </>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "border-input focus-within:ring-ring shadow-xs flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border bg-transparent px-3 py-1 text-sm transition-colors focus-within:ring-1",
            disabled && "cursor-not-allowed opacity-50",
          )}
          onClick={() => {
            if (!disabled) setOpen(!open);
          }}
        >
          {renderTagsDisplay()}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:bg-accent hover:text-accent-foreground ml-auto size-5 shrink-0 rounded-full p-0 opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) setOpen(!open);
            }}
            disabled={disabled}
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <AnimateChangeInHeight>
          <Command>
            <CommandInput
              placeholder="Search or create tag..."
              className="h-9"
              value={searchQuery}
              onValueChange={setSearchQuery}
              ref={commandInputRef}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  searchQuery.trim() &&
                  !allTags.some((tag) =>
                    tag.name
                      .toLowerCase()
                      .startsWith(searchQuery.toLowerCase()),
                  )
                ) {
                  e.preventDefault();
                  void handleCreateTag();
                }
              }}
            />

            <CommandList>
              <ScrollArea>
                <CommandEmpty className="py-2">
                  {searchQuery.trim() && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-2 py-1.5 text-sm"
                      onClick={() => void handleCreateTag()}
                      disabled={disabled ?? createTagMutation.isPending}
                    >
                      <Plus className="mr-2 size-4" />
                      Create "{searchQuery}"
                      {createTagMutation.isPending && "..."}
                    </Button>
                  )}
                  {!searchQuery.trim() && !tagsLoading && (
                    <p className="text-muted-foreground px-2 py-1.5 text-sm">
                      No tags found
                    </p>
                  )}
                  {tagsLoading && (
                    <p className="text-muted-foreground px-2 py-1.5 text-sm">
                      Loading tags...
                    </p>
                  )}
                </CommandEmpty>

                {selectedTagObjects.length > 0 && (
                  <CommandGroup heading="Selected">
                    {selectedTagObjects.map((tag: InfiniteTag) => {
                      const isAIGenerated = tag.type === "IA";
                      return (
                        <CommandItem
                          key={tag.id}
                          className={cn("flex items-center gap-2")}
                          onSelect={() => handleTagSelect(tag.name)}
                        >
                          <Checkbox checked={true} />
                          {isAIGenerated && (
                            <Bot className="size-3 text-blue-600" />
                          )}
                          <span
                            className={cn("text-accent-foreground text-xs")}
                          >
                            {tag.name}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {filteredNonSelectedTags.length > 0 && (
                  <>
                    {selectedTagObjects.length > 0 && <CommandSeparator />}
                    <CommandGroup heading="Available">
                      {filteredNonSelectedTags.map((tag: InfiniteTag) => {
                        const isAIGenerated = tag.type === "IA";
                        return (
                          <CommandItem
                            key={tag.id}
                            className={cn("flex items-center gap-2")}
                            value={tag.name}
                            onSelect={() => handleTagSelect(tag.name)}
                          >
                            <Checkbox checked={false} />
                            {isAIGenerated && (
                              <Bot className="size-3 text-blue-600" />
                            )}
                            <span
                              className={cn("text-accent-foreground text-xs")}
                            >
                              {tag.name}
                            </span>
                          </CommandItem>
                        );
                      })}
                      {hasNextPage && (
                        <CommandItem
                          className="justify-center text-muted-foreground"
                          onSelect={() => fetchNextPage()}
                          disabled={isFetchingNextPage}
                        >
                          {isFetchingNextPage ? "Loading more..." : "Load more tags"}
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </>
                )}
              </ScrollArea>
            </CommandList>
          </Command>
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
}
