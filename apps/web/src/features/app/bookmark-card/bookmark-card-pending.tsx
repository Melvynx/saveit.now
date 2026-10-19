"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { BOOKMARK_STEPS } from "@/lib/bookmark-steps";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { ButtonProps } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { toast } from "sonner";
import { useBookmark } from "../bookmark-page/use-bookmark";
import { BookmarkCardContainer } from "./bookmark-card-container";
import { CardFooter, getDomain } from "./bookmark-card-parts";
import type { BookmarkCardData } from "./bookmark.types";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

interface BookmarkCardPendingProps {
  bookmark: BookmarkCardData;
}

const VISIBLE_STEPS = 8;

/** Shimmer card with the live processing step from the Convex pipeline. */
export const BookmarkCardPending = ({ bookmark }: BookmarkCardPendingProps) => {
  const domain = getDomain(bookmark.url);
  // Search results are a snapshot; subscribe so the step stays live there too.
  const live = useBookmark(bookmark.id);
  const stepIndex =
    live.data?.bookmark.processingStep ?? bookmark.processingStep ?? 0;
  const step =
    BOOKMARK_STEPS.find((item) => item.order === stepIndex) ??
    BOOKMARK_STEPS[0];
  const progress = Math.min(stepIndex, VISIBLE_STEPS) / VISIBLE_STEPS;

  return (
    <BookmarkCardContainer
      bookmark={bookmark}
      testId="bookmark-card-pending"
      aria-busy="true"
    >
      <div className="relative flex min-h-36 flex-col justify-end gap-3 overflow-hidden bg-muted/70 p-4">
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-linear-to-br from-transparent via-background/40 to-transparent"
        />
        <p className="relative line-clamp-3 font-serif text-[18px] leading-tight font-medium text-foreground/70">
          {bookmark.title || domain}
        </p>
        <div className="relative flex flex-col gap-2">
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-foreground/8">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-(--ease-out-soft)"
              style={{ width: `${Math.max(progress, 0.06) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Text
              variant="shine"
              key={step.name}
              className="text-[12px] font-medium"
            >
              {step.name}…
            </Text>
            <DeleteButtonAction
              bookmarkId={bookmark.id}
              className="-mr-2 h-6 px-2 text-[12px] text-muted-foreground"
            />
          </div>
        </div>
      </div>
      <div className="px-3.5 pb-3">
        <CardFooter
          domain={domain}
          faviconUrl={bookmark.faviconUrl}
          type={bookmark.type}
          className="mt-2.5"
        />
      </div>
    </BookmarkCardContainer>
  );
};

export const DeleteButtonAction = ({
  bookmarkId,
  ...props
}: ButtonProps & { bookmarkId: string }) => {
  const removeBookmark = useMutation(api.bookmarks.mutations.remove);
  const [isPending, setIsPending] = useState(false);

  const handleDelete = () => {
    setIsPending(true);
    void removeBookmark({ id: bookmarkId as Id<"bookmarks"> })
      .then(() => toast.success("Bookmark deleted"))
      .finally(() => setIsPending(false));
  };

  return (
    <LoadingButton
      loading={isPending}
      variant="ghost"
      size="sm"
      onClick={(event) => {
        event.stopPropagation();
        handleDelete();
      }}
      {...props}
    >
      {props.children ?? "Stop"}
    </LoadingButton>
  );
};
