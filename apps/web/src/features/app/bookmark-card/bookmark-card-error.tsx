"use client";

import { Input } from "@workspace/ui/components/input";
import { AlertCircle, RefreshCcw, Trash2 } from "lucide-react";

import { LoadingButton } from "@/features/form/loading-button";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
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
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

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
  const reprocess = useMutation(api.bookmarks.mutations.reprocess);
  const [isPending, setIsPending] = useState(false);

  const handleReprocess = () => {
    setIsPending(true);
    void reprocess({ id: bookmarkId as Id<"bookmarks"> }).finally(() =>
      setIsPending(false),
    );
  };

  return (
    <LoadingButton
      data-testid="rebookmark-button"
      loading={isPending}
      size={children ? "sm" : "icon"}
      variant="outline"
      className={children ? "" : "size-8"}
      onClick={handleReprocess}
    >
      {children ?? <RefreshCcw className="text-muted-foreground size-4" />}
    </LoadingButton>
  );
};

export const BookmarkCardError = ({ bookmark }: BookmarkCardErrorProps) => {
  const metadata = bookmark.metadata as { error?: string } | null | undefined;
  const errorMessage =
    bookmark.processingError ?? metadata?.error ?? "Processing failed";

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
        <BookmarkCardDescription>{errorMessage}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
