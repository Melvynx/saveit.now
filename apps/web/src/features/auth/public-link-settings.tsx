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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Switch } from "@workspace/ui/components/switch";
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
      setError(
        error instanceof Error ? error.message : "Failed to update settings",
      );
    },
  });

  const publicUrl = `https://saveit.now/u/${slug || "your-slug"}`;
  const canUsePublicUrl = enabled && Boolean(slug);

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
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="public-link-enabled">
                Enable public link
              </FieldLabel>
              <FieldDescription>
                Choose whether your public bookmark page is available.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="public-link-enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked)}
            />
          </Field>

          <div
            className={cn("flex flex-col gap-4 transition-opacity", {
              "pointer-events-none opacity-50": !enabled,
            })}
          >
            <Field className="max-w-sm" data-disabled={!enabled}>
              <FieldLabel htmlFor="public-slug">Slug</FieldLabel>
              <Input
                id="public-slug"
                type="text"
                placeholder="my-bookmarks"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
                disabled={!enabled}
              />
            </Field>

            <Field data-disabled={!enabled}>
              <FieldLabel htmlFor="public-url">Public URL</FieldLabel>
              <InputGroup className="max-w-xl">
                <InputGroupInput
                  id="public-url"
                  readOnly
                  value={publicUrl}
                  className="font-mono"
                  disabled={!enabled}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Copy public link"
                    disabled={!canUsePublicUrl}
                    onClick={() => copyToClipboard(publicUrl)}
                  >
                    {isCopied ? <Check /> : <Copy />}
                  </InputGroupButton>
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Open public link"
                    disabled={!canUsePublicUrl}
                    onClick={() =>
                      window.open(`/u/${slug}`, "_blank", "noreferrer")
                    }
                  >
                    <ExternalLink />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Share this URL with people who can view your public bookmarks.
              </FieldDescription>
            </Field>
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
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
