"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { BOOKMARK_STEPS } from "@/lib/bookmark-steps";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { ButtonProps } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Loader } from "@workspace/ui/components/loader";
import { Text } from "@workspace/ui/components/text";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  useBookmark,
  useBookmarkMetadata,
} from "../bookmark-page/use-bookmark";
import {
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";
import type { BookmarkCardData } from "./bookmark.types";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

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
 * Shows a step-by-step processing indicator driven by the reactive
 * `processingStep` field the Convex pipeline patches as it runs.
 * Replaces the old Inngest realtime token-based progress UI.
 */
function ProcessingIndicator({ bookmarkId }: { bookmarkId: string }) {
  const bookmark = useBookmark(bookmarkId);
  const currentStepIdx = bookmark.data?.bookmark.processingStep ?? 0;
  const currentStep =
    BOOKMARK_STEPS.find((step) => step.order === currentStepIdx) ??
    BOOKMARK_STEPS[0];

  return (
    <div className="flex flex-col items-start w-fit mx-auto justify-center gap-2">
      <div className="flex w-full items-center justify-center gap-2">
        {Array.from({ length: 9 }).map((_, idx) => {
          const isActive = idx === currentStepIdx;
          const isCompleted = idx < currentStepIdx;
          return (
            <motion.div
              key={idx}
              layout
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{
                scale: isActive ? 1.2 : 1,
                opacity: isActive ? 1 : isCompleted ? 0.8 : 0.4,
                backgroundColor:
                  isActive || isCompleted ? "var(--primary)" : "var(--accent)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="h-1 rounded-full"
              style={{
                height: 3,
                width: 10,
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 relative -left-0.5">
        <Loader className="text-muted-foreground size-4" />
        <Text variant="shine" key={currentStep.name}>
          {currentStep.name}
        </Text>
      </div>
    </div>
  );
}

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
      onClick={handleDelete}
      {...props}
    >
      {props.children ?? "Stop"}
    </LoadingButton>
  );
};
