import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Plus, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useRef } from "react";
import { toast } from "sonner";
import { URL_SCHEMA } from "./schema";
import { useCreateBookmarkAction } from "./use-create-bookmark";

export const SearchInput = () => {
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bookmarks"
          onKeyDown={(e) => {
            if (e.key === "Enter" && isUrl) {
              action.execute({ url: query });
            }
          }}
        />
      </div>
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
