"use client";

import { BookmarkType } from "@workspace/database";
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
import { ChevronDown, FileType, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getTypeColor, getTypeDisplayName } from "../utils/type-filter-utils";

const BOOKMARK_TYPES: BookmarkType[] = Object.values(BookmarkType);

function TypeBadge({
  type,
  onRemove,
}: {
  type: BookmarkType;
  onRemove: (type: BookmarkType) => void;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("flex items-center gap-1 pr-1", getTypeColor(type))}
    >
      <span className="max-w-[80px] truncate">{getTypeDisplayName(type)}</span>
      <button
        type="button"
        className="hover:bg-accent size-4 rounded-full p-0 transition"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(type);
        }}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}

type TypeMultiSelectProps = {
  selectedTypes: BookmarkType[];
  onTypesChange: (types: BookmarkType[]) => void;
  placeholder?: string;
  className?: string;
};

export function TypeMultiSelect({
  selectedTypes,
  onTypesChange,
  placeholder = "Types",
  className,
}: TypeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTypes = useMemo(() => {
    return BOOKMARK_TYPES.filter((type) =>
      getTypeDisplayName(type)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const availableTypes = useMemo(() => {
    return filteredTypes.filter((type) => !selectedTypes.includes(type));
  }, [filteredTypes, selectedTypes]);

  const selectedTypesFiltered = useMemo(() => {
    return filteredTypes.filter((type) => selectedTypes.includes(type));
  }, [filteredTypes, selectedTypes]);

  const handleTypeSelect = (type: BookmarkType) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    onTypesChange(newTypes);
  };

  const handleRemoveType = (type: BookmarkType) => {
    onTypesChange(selectedTypes.filter((t) => t !== type));
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
          {selectedTypes.length > 0 ? (
            <div className="flex items-center gap-1 overflow-hidden">
              {selectedTypes.length === 1 && selectedTypes[0] ? (
                <TypeBadge
                  type={selectedTypes[0]}
                  onRemove={handleRemoveType}
                />
              ) : (
                <Badge variant="secondary">
                  <FileType className="mr-1 size-3" />
                  {selectedTypes.length} types
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <FileType className="size-3" />
              {placeholder}
            </span>
          )}
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search types..."
            className="h-9"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              <p className="text-muted-foreground px-2 py-1.5 text-sm">
                No types found
              </p>
            </CommandEmpty>

            {selectedTypesFiltered.length > 0 && (
              <CommandGroup heading="Selected">
                {selectedTypesFiltered.map((type) => (
                  <CommandItem
                    key={type}
                    className="flex items-center gap-2"
                    onSelect={() => handleTypeSelect(type)}
                  >
                    <Checkbox checked={true} />
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", getTypeColor(type))}
                    >
                      {getTypeDisplayName(type)}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {availableTypes.length > 0 && (
              <>
                {selectedTypesFiltered.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Available">
                  {availableTypes.map((type) => (
                    <CommandItem
                      key={type}
                      className="flex items-center gap-2"
                      value={getTypeDisplayName(type)}
                      onSelect={() => handleTypeSelect(type)}
                    >
                      <Checkbox checked={false} />
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", getTypeColor(type))}
                      >
                        {getTypeDisplayName(type)}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
