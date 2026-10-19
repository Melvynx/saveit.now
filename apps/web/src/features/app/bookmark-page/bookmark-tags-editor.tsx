"use client";

import { useAuthedQuery } from "@/hooks/use-authed-query";
import { getErrorMessage } from "@/lib/errors";
import { api } from "@convex/_generated/api";
import type { BookmarkDetailDTO, TagDTO } from "@convex/bookmarks/dto";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useMutation } from "convex/react";
import { Hash, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TagChip = { name: string; type: string };

export function BookmarkTagsEditor({
  bookmark,
  disabled = false,
}: {
  bookmark: BookmarkDetailDTO;
  disabled?: boolean;
}) {
  const setTags = useMutation(api.tags.mutations.setBookmarkTagsByName);
  const [pending, setPending] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const allTags = useAuthedQuery(
    api.tags.queries.list,
    open ? { paginationOpts: { numItems: 200, cursor: null } } : "skip",
  );

  const savedTags: TagChip[] = bookmark.tags.map(({ tag }) => ({
    name: tag.name,
    type: tag.type,
  }));
  const chips: TagChip[] = pending
    ? pending.map(
        (name) =>
          savedTags.find((tag) => tag.name === name) ?? { name, type: "USER" },
      )
    : savedTags;
  const selected = new Set(chips.map((tag) => tag.name.toLowerCase()));

  const commit = (names: string[]) => {
    setPending(names);
    void setTags({ bookmarkId: bookmark._id, tagNames: names })
      .catch((error) =>
        toast.error(getErrorMessage(error, "Could not update tags")),
      )
      .finally(() => setPending(null));
  };

  const addTag = (raw: string) => {
    const name = raw.trim().replace(/^#/, "");
    if (!name || selected.has(name.toLowerCase())) return;
    commit([...chips.map((tag) => tag.name), name]);
    setSearch("");
  };

  const removeTag = (name: string) => {
    commit(chips.map((tag) => tag.name).filter((tag) => tag !== name));
  };

  const suggestions = ((allTags?.page ?? []) as TagDTO[]).filter(
    (tag) => !selected.has(tag.name.toLowerCase()),
  );
  const query = search.trim().replace(/^#/, "");
  const hasExactMatch = suggestions.some(
    (tag) => tag.name.toLowerCase() === query.toLowerCase(),
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((tag) => (
        <span
          key={tag.name}
          className="group/tag inline-flex h-6 items-center gap-1 rounded-full bg-muted pr-1 pl-2 text-xs text-foreground ring-1 ring-foreground/5 ring-inset"
        >
          {tag.type === "IA" ? (
            <Sparkles
              aria-label="Suggested by AI"
              className="size-3 text-muted-foreground"
            />
          ) : (
            <Hash className="size-3 text-muted-foreground" />
          )}
          <span className="max-w-40 truncate">{tag.name}</span>
          <button
            type="button"
            aria-label={`Remove tag ${tag.name}`}
            disabled={disabled}
            onClick={() => removeTag(tag.name)}
            className="flex size-4 items-center justify-center rounded-full text-muted-foreground opacity-60 transition-opacity outline-none group-hover/tag:opacity-100 hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            className="rounded-full border-dashed border-border text-muted-foreground hover:text-foreground"
          >
            <Plus />
            {chips.length === 0 ? "Add tags" : "Add"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput
              placeholder="Find or create a tag…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-64">
              <CommandEmpty className="py-4 text-center text-[13px] text-muted-foreground">
                {allTags === undefined ? "Loading tags…" : "No matching tags"}
              </CommandEmpty>
              {query && !hasExactMatch ? (
                <CommandGroup>
                  <CommandItem
                    value={`__create__${query}`}
                    onSelect={() => addTag(query)}
                  >
                    <Plus />
                    Create “{query}”
                  </CommandItem>
                </CommandGroup>
              ) : null}
              {suggestions.length > 0 ? (
                <CommandGroup heading="Your tags">
                  {suggestions.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => addTag(tag.name)}
                    >
                      <Hash className="text-muted-foreground" />
                      <span className="truncate">{tag.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
