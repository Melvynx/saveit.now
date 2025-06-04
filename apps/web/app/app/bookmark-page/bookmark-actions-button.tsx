"use client";

import { WithUseRouter } from "@/components-hooks/with-use-router";
import { LoadingButton } from "@/features/form/loading-button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ButtonProps } from "@workspace/ui/components/button";
import { Check, Copy, RefreshCcw, X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { reBookmarkAction } from "./bookmarks.action";

export const BackButton = () => {
  return (
    <WithUseRouter>
      {({ router }) => (
        <Button
          size="icon"
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
      onClick={() => {
        posthog.capture("bookmark+copy_link", {
          url,
        });
        copyToClipboard(url);
      }}
      {...props}
    >
      {isCopied ? (
        <Check className="text-muted-foreground size-4" />
      ) : (
        <Copy className="text-muted-foreground size-4" />
      )}
    </Button>
  );
};

export const ReBookmarkButton = ({ bookmarkId }: { bookmarkId: string }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const posthog = usePostHog();
  const action = useAction(reBookmarkAction, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "bookmarks",
      });
      router.back();
    },
  });

  return (
    <LoadingButton
      loading={action.isPending}
      size="icon"
      variant="outline"
      className="size-8"
      onClick={() => {
        posthog.capture("bookmark+rebookmark", {
          bookmark_id: bookmarkId,
        });
        action.execute({ bookmarkId });
      }}
    >
      <RefreshCcw className="text-muted-foreground size-4" />
    </LoadingButton>
  );
};
