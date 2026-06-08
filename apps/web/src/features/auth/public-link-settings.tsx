"use client";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { upfetch } from "@/lib/up-fetch";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

type PublicLinkSettingsProps = {
  initialEnabled: boolean;
  initialSlug: string | null;
};

export function PublicLinkSettings({
  initialEnabled,
  initialSlug,
}: PublicLinkSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [error, setError] = useState<string | null>(null);
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const mutation = useMutation({
    mutationFn: async () =>
      upfetch("/api/user/public-link", {
        method: "PATCH",
        body: { enabled, slug: enabled ? slug : null },
        schema: z.object({ success: z.boolean() }),
      }),
    onSuccess: () => {
      toast.success("Public link settings updated");
      setError(null);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : "Failed to update settings");
    },
  });

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/u/${slug}`;

  const handleSave = () => {
    setError(null);
    if (enabled && !slug.trim()) {
      setError("Slug is required when enabling public link");
      return;
    }
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public link</CardTitle>
        <CardDescription>
          Let anyone view bookmarks you choose to expose publicly.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="public-link-enabled"
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked === true)}
          />
          <Label htmlFor="public-link-enabled">Enable public link</Label>
        </div>

        <div
          className={cn("flex flex-col gap-3 transition-opacity", {
            "opacity-50 pointer-events-none": !enabled,
          })}
        >
          <div className="flex max-w-sm flex-col gap-2">
            <Label htmlFor="public-slug">Slug</Label>
            <Input
              id="public-slug"
              type="text"
              placeholder="my-bookmarks"
              value={slug}
              onChange={(event) =>
                setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              disabled={!enabled}
            />
            <p className="text-muted-foreground text-xs">
              Your public page will be available at{" "}
              <code className="bg-muted rounded px-1">
                saveit.now/u/{slug || "your-slug"}
              </code>
            </p>
          </div>

          {enabled && slug && (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={publicUrl}
                className="bg-muted text-muted-foreground"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copy public link"
                onClick={() => copyToClipboard(publicUrl)}
              >
                {isCopied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
              <Button type="button" variant="outline" size="icon" asChild>
                <a
                  href={`/u/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open public link"
                >
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button
          onClick={handleSave}
          disabled={mutation.isPending}
          size="sm"
          className="w-fit"
        >
          {mutation.isPending ? "Saving..." : "Save public link"}
        </Button>
      </CardContent>
    </Card>
  );
}
