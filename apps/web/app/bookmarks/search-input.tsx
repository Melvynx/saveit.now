import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useAction } from "next-safe-action/hooks";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { createBookmarkAction } from "./bookmarks.action";
import { URL_SCHEMA } from "./schema";

export type SearchInputProps = {};

export const SearchInput = (props: SearchInputProps) => {
  const [query, setQuery] = useQueryState("query", {
    defaultValue: "",
  });

  console.log(query);

  const isUrl = URL_SCHEMA.safeParse(query).success;

  const action = useAction(createBookmarkAction, {
    onSuccess: () => {
      // setQuery("");
      toast.success("Bookmark added");
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Input
        defaultValue={query}
        className="lg:text-2xl lg:h-16 lg:py-4 lg:px-6"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search bookmarks"
      />
      {isUrl ? (
        <Button
          onClick={() => {
            action.execute({ url: query });
          }}
          variant="outline"
        >
          Add
        </Button>
      ) : null}
    </div>
  );
};
