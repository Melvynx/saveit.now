"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";

import { LoadingButton } from "@/features/form/loading-button";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { BookmarkCardContainer } from "./bookmark-card-container";
import { CardFooter, getDomain } from "./bookmark-card-parts";
import { DeleteButtonAction } from "./bookmark-card-pending";
import type { BookmarkCardData } from "./bookmark.types";
import type { Id } from "@convex/_generated/dataModel";
import { toUserFacingProcessingError } from "@convex/processing/detect";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface BookmarkCardErrorProps {
  bookmark: BookmarkCardData;
}

export const ReBookmarkButton = ({
  bookmarkId,
  children,
  className,
}: {
  bookmarkId: string;
  children?: React.ReactNode;
  className?: string;
}) => {
  const reprocess = useMutation(api.bookmarks.mutations.reprocess);
  const [isPending, setIsPending] = useState(false);

  const handleReprocess = () => {
    setIsPending(true);
    void reprocess({ id: bookmarkId as Id<"bookmarks"> })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error, "Failed to reprocess bookmark"));
      })
      .finally(() => setIsPending(false));
  };

  return (
    <LoadingButton
      data-testid="rebookmark-button"
      loading={isPending}
      size={children ? "sm" : "icon"}
      variant="outline"
      className={className ?? (children ? "" : "size-8")}
      onClick={(event) => {
        event.stopPropagation();
        handleReprocess();
      }}
    >
      {children ?? <RefreshCcw className="text-muted-foreground size-4" />}
    </LoadingButton>
  );
};

/** Compact failure card: what broke, plus retry / delete. */
export const BookmarkCardError = ({ bookmark }: BookmarkCardErrorProps) => {
  const metadata = bookmark.metadata as { error?: string } | null | undefined;
  const errorMessage = toUserFacingProcessingError(
    bookmark.processingError || metadata?.error,
  );
  const domain = getDomain(bookmark.url);

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-error">
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <AlertCircle className="size-3.5" aria-hidden />
          </span>
          <p className="text-[13px] font-semibold text-foreground">
            Couldn&apos;t save this page
          </p>
        </div>
        <p className="line-clamp-2 text-[12px] leading-normal text-muted-foreground">
          {errorMessage}
        </p>
        <div className="flex items-center gap-1.5 pt-0.5">
          <ReBookmarkButton
            bookmarkId={bookmark.id}
            className="h-7 gap-1.5 px-2.5 text-[12px]"
          >
            <RefreshCcw className="size-3" aria-hidden />
            Retry
          </ReBookmarkButton>
          <DeleteButtonAction
            bookmarkId={bookmark.id}
            className="h-7 px-2.5 text-[12px] text-muted-foreground"
          >
            Delete
          </DeleteButtonAction>
        </div>
        <CardFooter
          domain={domain}
          faviconUrl={bookmark.faviconUrl}
          type={bookmark.type}
          className="mt-0.5 border-t border-border/60 pt-2.5"
        />
      </div>
    </BookmarkCardContainer>
  );
};
