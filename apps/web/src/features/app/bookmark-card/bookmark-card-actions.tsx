"use client";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Button } from "@workspace/ui/components/button";
import type { ButtonProps } from "@workspace/ui/components/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePostHog } from "posthog-js/react";
import { StarButton } from "../bookmark-page/star-button";
import { ReadButton } from "../bookmark-page/read-button";
import { ExternalLinkTracker } from "../external-link-tracker";

interface BookmarkCardActionsProps {
  bookmarkId: string;
  url: string;
  starred: boolean;
  read?: boolean;
  bookmarkType?: string | null;
  className?: string;
  children?: React.ReactNode;
}

export const BookmarkCardActions = ({
  bookmarkId,
  url,
  starred,
  read = false,
  bookmarkType,
  className = "",
  children,
}: BookmarkCardActionsProps) => {
  return (
    <div
      className={`absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 ${className}`}
    >
      <ExternalLinkTracker
        bookmarkId={bookmarkId}
        url={url}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="secondary"
          size="icon"
          className="size-8 hover:bg-accent"
        >
          <ExternalLink className="text-muted-foreground size-4" />
        </Button>
      </ExternalLinkTracker>
      <CopyLinkButton
        url={url}
        variant="secondary"
        size="icon"
        className="size-8 hover:bg-accent"
      />
      <StarButton
        bookmarkId={bookmarkId}
        starred={starred}
        variant="secondary"
        size="icon"
        className="size-8 hover:bg-accent"
        showTooltip={false}
      />
      {(bookmarkType === "ARTICLE" || bookmarkType === "YOUTUBE") && (
        <ReadButton
          bookmarkId={bookmarkId}
          read={read}
          variant="secondary"
          size="icon"
          className="size-8 hover:bg-accent"
        />
      )}
      {children}
    </div>
  );
};

const CopyLinkButton = ({
  url,
  ...props
}: { url: string } & ButtonProps) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard(5000);
  const posthog = usePostHog();

  return (
    <Button
      size="icon"
      variant="outline"
      className="size-8"
      data-testid="copy-link-button"
      onClick={(event) => {
        event.stopPropagation();
        posthog.capture("bookmark+copy_link", {
          url,
        });
        copyToClipboard(url);
      }}
      {...props}
    >
      <AnimatePresence mode="popLayout">
        {isCopied ? (
          <motion.div
            key="copied"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Check className="text-muted-foreground size-4" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Copy className="text-muted-foreground size-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
};
