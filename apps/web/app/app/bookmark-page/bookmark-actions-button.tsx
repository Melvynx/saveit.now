"use client";

import { WithUseRouter } from "@/components-hooks/with-use-router";
import { LoadingButton } from "@/features/form/loading-button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ButtonProps } from "@workspace/ui/components/button";
import { Check, Copy, RefreshCcw, Share, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import { usePostHog } from "posthog-js/react";
import React from "react";
import { useNavigate } from "react-router";
import { reBookmarkAction } from "./bookmarks.action";

export const BackButton = () => {
  return (
    <WithUseRouter>
      {({ router }) => (
        <Button
          size="icon"
          data-testid="back-button"
          variant="outline"
          className="size-8"
          onClick={() => router.back()}
        >
          <X className="text-muted-foreground size-4" />
        </Button>
      )}
    </WithUseRouter>
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const action = useAction(reBookmarkAction, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "bookmarks",
      });
      navigate(-1);
    },
  });

  return (
    <LoadingButton
      data-testid="rebookmark-button"
      loading={action.isPending}
      size={children ? "sm" : "icon"}
      variant="outline"
      className={children ? "" : "size-8"}
      onClick={() => {
        posthog.capture("bookmark+rebookmark", {
          bookmark_id: bookmarkId,
        });
        action.execute({ bookmarkId });
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
