"use client";

import { BookmarkType } from "@/lib/bookmark-types";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronDown, Shapes } from "lucide-react";
import { useState } from "react";
import { filterChipClassName } from "../search/filter-chip";
import { getTypeDisplayName, getTypeIcon } from "../utils/type-filter-utils";

const ALL_TYPES = Object.values(BookmarkType) as BookmarkType[];

type TypeMultiSelectProps = {
  selectedTypes: BookmarkType[];
  onTypesChange: (types: BookmarkType[]) => void;
  /** Types listed in the popover. Defaults to every bookmark type. */
  types?: BookmarkType[];
  placeholder?: string;
  className?: string;
};

/** Pill-shaped type filter that opens a checklist popover. */
export function TypeMultiSelect({
  selectedTypes,
  onTypesChange,
  types = ALL_TYPES,
  placeholder = "Types",
  className,
}: TypeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedHere = selectedTypes.filter((type) => types.includes(type));
  const active = selectedHere.length > 0;

  const toggleType = (type: BookmarkType) => {
    onTypesChange(
      selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type)
        : [...selectedTypes, type],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(filterChipClassName(active), className)}
        aria-label="Filter by type"
      >
        <Shapes aria-hidden="true" />
        {placeholder}
        {active ? (
          <span className="rounded-full bg-primary/15 px-1.5 text-[11px] leading-4 text-primary tabular-nums">
            {selectedHere.length}
          </span>
        ) : null}
        <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        className="w-52 gap-0 overflow-hidden rounded-[14px] p-0"
        align="start"
      >
        <Command>
          <CommandList className="p-1">
            <CommandGroup>
              {types.map((type) => {
                const Icon = getTypeIcon(type);
                return (
                  <CommandItem
                    key={type}
                    value={type}
                    data-checked={selectedTypes.includes(type)}
                    onSelect={() => toggleType(type)}
                    className="gap-2 rounded-md px-2 py-1.5 text-[13px] [&>svg:last-child]:text-primary"
                  >
                    <Icon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="flex-1">{getTypeDisplayName(type)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
