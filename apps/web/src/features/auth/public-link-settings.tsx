"use client";

import { updatePublicLinkAction } from "app/(auth)/account/update-public-link.action";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
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
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

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

  const { execute, isPending } = useAction(updatePublicLinkAction, {
    onSuccess: () => {
      toast.success("Public link settings updated");
      setError(null);
    },
    onError: (error) => {
      setError(error.error.serverError?.message ?? "Failed to update settings");
    },
  });

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/u/${slug}`;

  const handleSave = () => {
    setError(null);
    if (enabled && !slug.trim()) {
      setError("Slug is required when enabling public link");
      return;
    }
    execute({ enabled, slug: enabled ? slug : null });
  };

  const handleCopy = () => {
    copyToClipboard(publicUrl);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Link</CardTitle>
        <CardDescription>
          Share a public link to let anyone view your bookmarks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="public-link-enabled"
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked === true)}
          />
          <Label htmlFor="public-link-enabled">Enable public link</Label>
        </div>

        <div
          className={cn("space-y-3 transition-opacity", {
            "opacity-50 pointer-events-none": !enabled,
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="public-slug">Slug</Label>
            <Input
              id="public-slug"
              type="text"
              placeholder="my-bookmarks"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
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
                onClick={handleCopy}
              >
                {isCopied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
              <Button type="button" variant="outline" size="icon" asChild>
                <Link href={`/u/${slug}`} target="_blank">
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
