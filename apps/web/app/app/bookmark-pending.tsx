"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "@workspace/database";
import { ButtonProps } from "@workspace/ui/components/button";
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
import { BookmarkFavicon } from "./bookmark-favicon";
import {
  useBookmarkMetadata,
  useBookmarkToken,
} from "./bookmark-page/use-bookmark";
import BookmarkProgress from "./bookmark-progress";
import { useRefreshBookmarks } from "./use-bookmarks";

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
    <Card className="w-full p-0 gap-0 overflow-hidden h-[var(--card-height)]">
      <CardHeader className="p-0">
        <div className="bg-border flex h-44 w-full flex-col items-center justify-center gap-4 rounded-md object-cover object-top">
          {token.data ? (
            <BookmarkProgress token={token.data.token} />
          ) : (
            <p>Loading...</p>
          )}
          <DeleteButtonAction bookmarkId={props.bookmark.id} />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <BookmarkFavicon
            faviconUrl={props.bookmark.faviconUrl}
            bookmarkType={props.bookmark.type ?? "PAGE"}
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

export const DeleteButtonAction = ({
  bookmarkId,
  ...props
}: ButtonProps & { bookmarkId: string }) => {
  const refreshBookmarks = useRefreshBookmarks();
  const deleteAction = useAction(deleteBookmarkAction, {
    onSuccess: () => {
      toast.success("Bookmark deleted");
      void refreshBookmarks();
    },
  });

  return (
    <LoadingButton
      loading={deleteAction.isExecuting}
      variant="ghost"
      size="sm"
      onClick={() =>
        deleteAction.execute({
          bookmarkId,
        })
      }
      {...props}
    >
      {props.children ?? "Stop"}
    </LoadingButton>
  );
};
