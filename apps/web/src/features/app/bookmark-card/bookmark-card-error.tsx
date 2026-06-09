"use client";

import { Input } from "@workspace/ui/components/input";
import { AlertCircle, RefreshCcw, Trash2 } from "lucide-react";

import { LoadingButton } from "@/features/form/loading-button";
import { upfetch } from "@/lib/up-fetch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Typography } from "@workspace/ui/components/typography";
import {
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
  HEADER_HEIGHT,
} from "./bookmark-card-base";
import { DeleteButtonAction } from "./bookmark-card-pending";
import type { BookmarkCardData } from "./bookmark.types";

interface BookmarkCardErrorProps {
  bookmark: BookmarkCardData;
}

const ReBookmarkButton = ({
  bookmarkId,
  children,
}: {
  bookmarkId: string;
  children?: React.ReactNode;
}) => {
  const queryClient = useQueryClient();
  const action = useMutation({
    mutationFn: () =>
      upfetch(`/api/bookmarks/${bookmarkId}`, {
        method: "PATCH",
        body: { status: "PENDING" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "bookmarks",
      });
    },
  });

  return (
    <LoadingButton
      data-testid="rebookmark-button"
      loading={action.isPending}
      size={children ? "sm" : "icon"}
      variant="outline"
      className={children ? "" : "size-8"}
      onClick={() => action.mutate()}
    >
      {children ?? <RefreshCcw className="text-muted-foreground size-4" />}
    </LoadingButton>
  );
};

export const BookmarkCardError = ({ bookmark }: BookmarkCardErrorProps) => {
  const metadata = bookmark.metadata as { error: string };

  return (
    <BookmarkCardContainer bookmark={bookmark}>
      <BookmarkCardHeader
        height={HEADER_HEIGHT}
        className="flex items-center justify-center"
      >
        <div className="flex items-center justify-center flex-col gap-4 h-full p-4">
          <div className="flex items-center gap-2 ">
            <AlertCircle className="size-4" />
            <Typography variant="small">Failed to Load</Typography>
          </div>

          <div className="flex items-center gap-2">
            <ReBookmarkButton bookmarkId={bookmark.id}>
              Rebookmark
            </ReBookmarkButton>

            <DeleteButtonAction bookmarkId={bookmark.id}>
              <Trash2 className="size-4 mr-2" />
              Delete
            </DeleteButtonAction>
          </div>

          <Input type="text" value={bookmark.url} readOnly />
        </div>
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark} href={null}>
        <BookmarkCardTitle>Error Details</BookmarkCardTitle>
        <BookmarkCardDescription>{metadata.error}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
