import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useQueryState } from "nuqs";
import { useRef } from "react";
import { toast } from "sonner";
import { URL_SCHEMA } from "./schema";
import { useCreateBookmarkAction } from "./use-create-bookmark";

export type SearchInputProps = {};

export const SearchInput = (props: SearchInputProps) => {
  const [query, setQuery] = useQueryState("query", {
    defaultValue: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const isUrl = URL_SCHEMA.safeParse(query).success;

  const action = useCreateBookmarkAction({
    onSuccess: () => {
      toast.success("Bookmark added");

      setQuery("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        defaultValue={query}
        className="lg:h-16 lg:px-6 lg:rounded-xl lg:py-4 lg:text-2xl"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search bookmarks"
        onKeyDown={(e) => {
          if (e.key === "Enter" && isUrl) {
            action.execute({ url: query });
          }
        }}
      />
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
