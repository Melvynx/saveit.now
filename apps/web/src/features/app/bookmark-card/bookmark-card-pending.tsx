"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { ButtonProps } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Loader } from "@workspace/ui/components/loader";
import { Text } from "@workspace/ui/components/text";
import { toast } from "sonner";
import {
  useBookmarkMetadata,
} from "../bookmark-page/use-bookmark";
import { useRefreshBookmarks } from "../use-bookmarks";
import {
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";
import type { BookmarkCardData } from "./bookmark.types";
import type { Id } from "@convex/_generated/dataModel";

interface BookmarkCardPendingProps {
  bookmark: BookmarkCardData;
}

export const BookmarkCardPending = ({ bookmark }: BookmarkCardPendingProps) => {
  const domainName = new URL(bookmark.url).hostname;
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
          <ProcessingIndicator bookmarkId={bookmark.id} />
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

/**
 * Shows a processing indicator using Convex reactive bookmark data.
 * Replaces the old Inngest realtime token-based progress UI.
 */
function ProcessingIndicator({ bookmarkId }: { bookmarkId: string }) {
  void bookmarkId;
  return (
    <div className="flex flex-col items-start w-fit mx-auto justify-center gap-2">
      <div className="flex w-full items-center justify-center gap-2">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-full bg-accent"
            style={{ height: 3, width: 10, borderRadius: 2, opacity: 0.4 }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 relative -left-0.5">
        <Loader className="text-muted-foreground size-4" />
        <Text variant="shine">Processing...</Text>
      </div>
    </div>
  );
}

export const DeleteButtonAction = ({
  bookmarkId,
  ...props
}: ButtonProps & { bookmarkId: string }) => {
  const refreshBookmarks = useRefreshBookmarks();
  const removeBookmark = useConvexMutation(api.bookmarks.mutations.remove);
  const deleteAction = useMutation({
    mutationFn: () => removeBookmark({ id: bookmarkId as Id<"bookmarks"> }),
    onSuccess: () => {
      toast.success("Bookmark deleted");
      void refreshBookmarks();
    },
  });

  return (
    <LoadingButton
      loading={deleteAction.isPending}
      variant="ghost"
      size="sm"
      onClick={() => deleteAction.mutate()}
      {...props}
    >
      {props.children ?? "Stop"}
    </LoadingButton>
  );
};
