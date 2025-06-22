import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Plus, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BookmarkType } from "@workspace/database";
import { useTags } from "@/features/tags/use-tags";
import { URL_SCHEMA } from "./schema";
import { useCreateBookmarkAction } from "./use-create-bookmark";

export type SearchInputProps = {};

export const SearchInput = (props: SearchInputProps) => {
  const [query, setQuery] = useQueryState("query", {
    defaultValue: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionType, setMentionType] = useState<"tag" | "type" | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");

  const { data: tags = [] } = useTags();

  const isUrl = URL_SCHEMA.safeParse(query).success;

  const handleMentionDetection = (value: string) => {
    const tagMatch = value.match(/(?:^|\s)#([^#@\s]*)$/);
    const typeMatch = value.match(/(?:^|\s)@([^#@\s]*)$/);

    if (tagMatch) {
      setMentionType("tag");
      setMentionQuery(tagMatch[1]);
      setMentionOpen(true);
    } else if (typeMatch) {
      setMentionType("type");
      setMentionQuery(typeMatch[1]);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  };

  const action = useCreateBookmarkAction({
    onSuccess: () => {
      toast.success("Bookmark added");

      setQuery("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
  });

  useEffect(() => {
    handleMentionDetection(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (value: string) => {
    if (!mentionType) return;
    const prefix = mentionType === "tag" ? "#" : "@";
    const regex = mentionType === "tag"
      ? /(?:^|\s)#([^#@\s]*)$/
      : /(?:^|\s)@([^#@\s]*)$/;

    const newQuery = query.replace(regex, (match) => {
      const start = match.startsWith(" ") ? " " : "";
      return `${start}${prefix}${value}`;
    });

    setQuery(newQuery + " ");
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
        <PopoverTrigger asChild>
          <div className="flex-1 relative">
            {isUrl ? (
              <Plus className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
            <Input
              ref={inputRef}
              defaultValue={query}
              className="lg:h-16 lg:px-6 lg:rounded-xl lg:py-4 lg:text-2xl bg-background pl-8 lg:pl-12"
              onChange={(e) => {
                setQuery(e.target.value);
                handleMentionDetection(e.target.value);
              }}
              placeholder="Search bookmarks, use #tag or @type"
              onKeyDown={(e) => {
                if (e.key === "Enter" && isUrl) {
                  action.execute({ url: query });
                }
              }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandList>
              {mentionType === "tag" && (
                <CommandGroup heading="Tags">
                  {tags
                    .filter((t) => t.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                    .map((tag) => (
                      <CommandItem key={tag.id} onSelect={() => handleSelect(tag.name)}>
                        {tag.name}
                      </CommandItem>
                    ))}
                  {tags.filter((t) => t.name.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                    <CommandEmpty>No tags found</CommandEmpty>
                  )}
                </CommandGroup>
              )}
              {mentionType === "type" && (
                <CommandGroup heading="Types">
                  {Object.values(BookmarkType)
                    .filter((t) => t.toLowerCase().includes(mentionQuery.toLowerCase()))
                    .map((type) => (
                      <CommandItem key={type} onSelect={() => handleSelect(type)}>
                        {type}
                      </CommandItem>
                    ))}
                  {Object.values(BookmarkType).filter((t) => t.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                    <CommandEmpty>No types found</CommandEmpty>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {isUrl ? (
        <Button
          onClick={() => {
            action.execute({ url: query });
          }}
          variant="outline"
          className="lg:h-16 lg:px-6 lg:py-4 lg:text-2xl"
        >
          Add
        </Button>
      ) : null}
    </div>
  );
};
