"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "@workspace/database";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { deleteBookmarkAction } from "app/app/bookmark-page/bookmarks.action";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import {
  useBookmarkMetadata,
  useBookmarkToken,
} from "./bookmark-page/use-bookmark";
import BookmarkProgress from "./bookmark-progress";

export const BookmarkPending = (props: { bookmark: Bookmark }) => {
  const domainName = new URL(props.bookmark.url).hostname;

  const token = useBookmarkToken(props.bookmark.id);
  const pageMetadata = useBookmarkMetadata(props.bookmark.id);
  const queryClient = useQueryClient();

  const deleteAction = useAction(deleteBookmarkAction, {
    onSuccess: () => {
      toast.success("Bookmark deleted");
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  return (
    <Card className="w-full p-0 gap-0 overflow-hidden">
      <CardHeader className="p-0">
        <div className="bg-border flex h-48 w-full flex-col items-center justify-center gap-4 rounded-md object-cover object-top">
          {token.data ? (
            <BookmarkProgress token={token.data.token} />
          ) : (
            <p>Loading...</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              deleteAction.execute({
                bookmarkId: props.bookmark.id,
              })
            }
          >
            Stop
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <img
            src={pageMetadata.data?.faviconUrl ?? ""}
            alt="favicon"
            className="h-4 w-4"
          />
          <div className="flex flex-col gap-2">
            <CardTitle>{domainName}</CardTitle>
            <CardDescription className="line-clamp-1">
              {pageMetadata.data?.title ?? "Processing..."}
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
