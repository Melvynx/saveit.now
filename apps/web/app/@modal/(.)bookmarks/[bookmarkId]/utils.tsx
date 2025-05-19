"use client";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { WithUseRouter } from "@workspace-hooks/with-use-router";
import { Button, ButtonProps } from "@workspace/ui/components/button";
import { Check, Copy, X } from "lucide-react";

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
          <X className="size-4 text-muted-foreground" />
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

  return (
    <Button
      size="icon"
      variant="outline"
      className="size-8"
      onClick={() => {
        copyToClipboard(url);
      }}
      {...props}
    >
      {isCopied ? (
        <Check className="size-4 text-muted-foreground" />
      ) : (
        <Copy className="size-4 text-muted-foreground" />
      )}
    </Button>
  );
};
