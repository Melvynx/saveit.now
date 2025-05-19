"use client";

import { AnimateChangeInHeight } from "@workspace/ui/components/animate-change-in-height";
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
import { cn } from "@workspace/ui/componentslib/utils";
import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { useCreateTagMutation, useTags } from "./use-tags";

type Tag = {
  id: string;
  name: string;
};

type TagSelectorProps = {
  selectedTags?: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
};

const VISIBLE_TAGS_COUNT = 3;

export function TagSelector({
  selectedTags = [],
  onTagsChange,
  disabled,
  placeholder = "Add tags...",
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);

  const { data: allTags = [] } = useTags();
  const createTagMutation = useCreateTagMutation({});

  // Filter out duplicates (in case the same tag appears in multiple pages)
  const uniqueTags = Array.from(
    new Map(allTags.map((tag: Tag) => [tag.id, tag])).values()
  );

  const selectedTagObjects = uniqueTags.filter((tag) =>
    selectedTags.includes(tag.name)
  );

  const nonSelectedTagObjects = uniqueTags.filter(
    (tag) => !selectedTags.includes(tag.name)
  );

  const filteredNonSelectedTags = searchQuery
    ? nonSelectedTagObjects.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : nonSelectedTagObjects;

  const handleTagSelect = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    onTagsChange(newTags);
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim()) return;

    try {
      // Create the tag
      await createTagMutation.mutateAsync(searchQuery.trim());

      // Add it to selected tags
      const newTags = [...selectedTags, searchQuery.trim()];
      onTagsChange(newTags);

      // Clear the search
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(selectedTags.filter((t) => t !== tag));
  };

  // Determine what to display in the trigger
  const renderTagsDisplay = () => {
    if (selectedTags.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (selectedTags.length <= VISIBLE_TAGS_COUNT) {
      return selectedTags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
        >
          <span>{tag}</span>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent size-4 rounded-full p-0 transition"
            onClick={(e) => handleRemoveTag(tag, e)}
            disabled={disabled}
          >
            <X className="size-3" />
          </Button>
        </Badge>
      ));
    }

    // If more than 1 tag, show first 1 and a count
    return (
      <>
        {selectedTags.slice(0, VISIBLE_TAGS_COUNT).map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            <span>{tag}</span>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-accent size-4 rounded-full p-0 transition"
              onClick={(e) => handleRemoveTag(tag, e)}
              disabled={disabled}
            >
              <X className="size-3" />
            </Button>
          </Badge>
        ))}
        <Badge variant="outline" className="bg-muted">
          +{selectedTags.length - 1} more
        </Badge>
      </>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "border-input focus-within:ring-ring flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-within:ring-1",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {renderTagsDisplay()}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:bg-accent hover:text-accent-foreground ml-auto size-5 shrink-0 rounded-full p-0 opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) setOpen(true);
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
                    tag.name.toLowerCase().startsWith(searchQuery.toLowerCase())
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
                  {!searchQuery.trim() && (
                    <p className="text-muted-foreground px-2 py-1.5 text-sm">
                      No tags found
                    </p>
                  )}
                </CommandEmpty>

                {selectedTagObjects.length > 0 && (
                  <CommandGroup heading="Selected">
                    {selectedTagObjects.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        className="flex items-center gap-2"
                        onSelect={() => handleTagSelect(tag.name)}
                      >
                        <Checkbox checked={true} />
                        <span className="text-accent-foreground text-xs">
                          {tag.name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {filteredNonSelectedTags.length > 0 && (
                  <>
                    {selectedTagObjects.length > 0 && <CommandSeparator />}
                    <CommandGroup heading="Available">
                      {filteredNonSelectedTags.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          className="flex items-center gap-2"
                          value={tag.name}
                          onSelect={() => handleTagSelect(tag.name)}
                        >
                          <Checkbox checked={false} />
                          <span className="text-accent-foreground text-xs">
                            {tag.name}
                          </span>
                        </CommandItem>
                      ))}
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
