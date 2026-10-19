"use client";

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
import { ChevronDown, Hash, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { filterChipClassName } from "../search/filter-chip";
import { useTags } from "../hooks/use-tags";

type TagMultiSelectProps = {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
};

function TagOption({
  name,
  checked,
  onSelect,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={name}
      onSelect={onSelect}
      data-checked={checked}
      className="gap-2 rounded-md px-2 py-1.5 text-[13px] [&>svg:last-child]:text-primary"
    >
      <Hash className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
    </CommandItem>
  );
}

/** Pill-shaped "Tags" filter that opens a searchable multi-select popover. */
export function TagMultiSelect({
  selectedTags,
  onTagsChange,
  placeholder = "Tags",
  className,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { filteredTags, isLoading } = useTags(searchQuery);

  const availableTags = useMemo(
    () => filteredTags.filter((tag) => !selectedTags.includes(tag.name)),
    [filteredTags, selectedTags],
  );

  const toggleTag = (tagName: string) => {
    onTagsChange(
      selectedTags.includes(tagName)
        ? selectedTags.filter((t) => t !== tagName)
        : [...selectedTags, tagName],
    );
  };

  const active = selectedTags.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(filterChipClassName(active), className)}
        aria-label="Filter by tags"
      >
        <Hash aria-hidden="true" />
        {placeholder}
        {active ? (
          <span className="rounded-full bg-primary/15 px-1.5 text-[11px] leading-4 text-primary tabular-nums">
            {selectedTags.length}
          </span>
        ) : null}
        <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        className="w-64 gap-0 overflow-hidden rounded-[14px] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Find a tag…"
            className="text-[13px]"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-72 p-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Loading tags…
              </div>
            ) : (
              <>
                <CommandEmpty className="py-8 text-center text-[13px] text-muted-foreground">
                  No tags found
                </CommandEmpty>
                {selectedTags.length > 0 ? (
                  <CommandGroup heading="Selected">
                    {selectedTags.map((name) => (
                      <TagOption
                        key={name}
                        name={name}
                        checked
                        onSelect={() => toggleTag(name)}
                      />
                    ))}
                  </CommandGroup>
                ) : null}
                {selectedTags.length > 0 && availableTags.length > 0 ? (
                  <CommandSeparator className="my-1" />
                ) : null}
                {availableTags.length > 0 ? (
                  <CommandGroup heading={searchQuery ? "Matches" : "Your tags"}>
                    {availableTags.map((tag) => (
                      <TagOption
                        key={tag.id}
                        name={tag.name}
                        checked={false}
                        onSelect={() => toggleTag(tag.name)}
                      />
                    ))}
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
