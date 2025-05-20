import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useRef } from "react";
import { toast } from "sonner";
import { createBookmarkAction } from "./bookmarks.action";
import { URL_SCHEMA } from "./schema";
import { useRefreshBookmarks } from "./use-bookmarks";

export type SearchInputProps = {};

export const SearchInput = (props: SearchInputProps) => {
  const [query, setQuery] = useQueryState("query", {
    defaultValue: "",
  });
  const refreshBookmark = useRefreshBookmarks();
  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const isUrl = URL_SCHEMA.safeParse(query).success;

  const action = useAction(createBookmarkAction, {
    onSuccess: () => {
      console.log("SUCCESS ACTION !!!!");
      console.log("Set query");
      setQuery("");

      void refreshBookmark();
      toast.success("Bookmark added");
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
        className="lg:h-16 lg:px-6 lg:py-4 lg:text-2xl"
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
