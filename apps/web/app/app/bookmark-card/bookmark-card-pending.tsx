"use client";

import { Bookmark } from "@workspace/database";

import { LoadingButton } from "@/features/form/loading-button";
import { ButtonProps } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { deleteBookmarkAction } from "../bookmark-page/bookmarks.action";
import {
  useBookmarkMetadata,
  useBookmarkToken,
} from "../bookmark-page/use-bookmark";
import BookmarkProgress from "../bookmark-progress";
import { useRefreshBookmarks } from "../use-bookmarks";
import {
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";

interface BookmarkCardPendingProps {
  bookmark: Bookmark;
}

export const BookmarkCardPending = ({ bookmark }: BookmarkCardPendingProps) => {
  const domainName = new URL(bookmark.url).hostname;
  const token = useBookmarkToken(bookmark.id);
  const pageMetadata = useBookmarkMetadata(bookmark.id);

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-pending">
      <BookmarkCardHeader>
        <div
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-4 rounded-md object-cover object-top",
            "bg-[image:repeating-linear-gradient(315deg,_var(--color-bg)_0,_var(--color-bg)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed",
          )}
          style={{
            // @ts-expect-error CSS Variable
            "--color-bg": `color-mix(in srgb, var(--border) 50%, transparent)`,
          }}
        >
          <BookmarkProgress
            bookmarkId={bookmark.id}
            token={token.data?.token}
          />
          <DeleteButtonAction bookmarkId={bookmark.id} />
        </div>
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark} href={null}>
        <BookmarkCardTitle>{domainName}</BookmarkCardTitle>
        <BookmarkCardDescription>
          {pageMetadata.data?.title ?? "Processing..."}
        </BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
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
