"use client";

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
import { cn } from "@workspace/ui/lib/utils";
import { ChevronDown, Hash, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTags, type Tag } from "../hooks/use-tags";

function TagBadge({
  tag,
  onRemove,
}: {
  tag: string;
  onRemove: (tag: string) => void;
}) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1 pr-1">
      <Hash className="size-3" />
      <span className="max-w-[80px] truncate">{tag}</span>
      <button
        type="button"
        className="hover:bg-accent size-4 rounded-full p-0 transition"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(tag);
        }}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}

type TagMultiSelectProps = {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function TagMultiSelect({
  selectedTags,
  onTagsChange,
  placeholder = "Tags",
  className,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { filteredTags, isLoading } = useTags(searchQuery);

  const selectedTagObjects = useMemo(() => {
    return selectedTags.map((name) => ({ name, id: name }));
  }, [selectedTags]);

  const availableTags = useMemo(() => {
    return filteredTags.filter((tag) => !selectedTags.includes(tag.name));
  }, [filteredTags, selectedTags]);

  const handleTagSelect = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    onTagsChange(newTags);
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 min-w-[120px] justify-between gap-1 px-3",
            className,
          )}
        >
          {selectedTags.length > 0 ? (
            <div className="flex items-center gap-1 overflow-hidden">
              {selectedTags.length === 1 && selectedTags[0] ? (
                <TagBadge tag={selectedTags[0]} onRemove={handleRemoveTag} />
              ) : (
                <Badge variant="secondary">
                  <Hash className="mr-1 size-3" />
                  {selectedTags.length} tags
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <Hash className="size-3" />
              {placeholder}
            </span>
          )}
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search tags..."
            className="h-9"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="text-muted-foreground px-2 py-8 text-center text-sm">
                Loading tags...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <p className="text-muted-foreground px-2 py-1.5 text-sm">
                    No tags found
                  </p>
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
                        <Hash className="size-3 opacity-50" />
                        <span className="text-sm">{tag.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {availableTags.length > 0 && (
                  <>
                    {selectedTagObjects.length > 0 && <CommandSeparator />}
                    <CommandGroup heading="Available">
                      {availableTags.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          className="flex items-center gap-2"
                          value={tag.name}
                          onSelect={() => handleTagSelect(tag.name)}
                        >
                          <Checkbox checked={false} />
                          <Hash className="size-3 opacity-50" />
                          <span className="text-sm">{tag.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
