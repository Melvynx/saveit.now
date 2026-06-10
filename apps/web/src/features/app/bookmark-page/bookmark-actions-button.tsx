"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "@tanstack/react-router";
import { Button, ButtonProps } from "@workspace/ui/components/button";
import { Check, Copy, RefreshCcw, Share, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePostHog } from "posthog-js/react";
import React, { useState } from "react";
import type { Id } from "@convex/_generated/dataModel";

export const BackButton = () => {
  const router = useRouter();

  return (
    <Button
      size="icon"
      data-testid="back-button"
      variant="outline"
      className="size-8"
      onClick={() => router.history.back()}
    >
      <X className="text-muted-foreground size-4" />
    </Button>
  );
};

export const ShareButton = ({
  bookmarkId,
  ...props
}: { bookmarkId: string } & ButtonProps) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard(5000);
  const posthog = usePostHog();
  const url = `${window.location.origin}/p/${bookmarkId}`;

  return (
    <Button
      size="icon"
      variant="outline"
      className="size-8"
      data-testid="share-button"
      onClick={() => {
        posthog.capture("bookmark+share", {
          bookmarkId,
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
            <Share className="text-muted-foreground size-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
};

export const CopyLinkButton = ({
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
      onClick={() => {
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

export const ReBookmarkButton = ({
  bookmarkId,
  children,
}: {
  bookmarkId: string;
  children?: React.ReactNode;
}) => {
  const router = useRouter();
  const posthog = usePostHog();
  const reprocess = useMutation(api.bookmarks.mutations.reprocess);
  const [isPending, setIsPending] = useState(false);

  const handleReprocess = () => {
    posthog.capture("bookmark+rebookmark", {
      bookmark_id: bookmarkId,
    });
    setIsPending(true);
    void reprocess({ id: bookmarkId as Id<"bookmarks"> })
      .then(() => router.history.back())
      .finally(() => setIsPending(false));
  };

  return (
    <LoadingButton
      data-testid="rebookmark-button"
      loading={isPending}
      size={children ? "sm" : "icon"}
      variant="outline"
      className={children ? "" : "size-8"}
      onClick={() => {
        handleReprocess();
      }}
    >
      {children ? (
        children
      ) : (
        <RefreshCcw className="text-muted-foreground size-4" />
      )}
    </LoadingButton>
  );
};
