"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Typography } from "@workspace/ui/components/typography";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

const ApiKeySuccessDialog = ({
  apiKey,
  name,
  onClose,
}: {
  apiKey: string;
  name: string;
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Typography variant="h3">API Key Created Successfully!</Typography>
        <Typography variant="muted">
          Your API key has been created. Copy it now because you will not be
          able to see it again.
        </Typography>
      </div>

      <div className="space-y-2">
        <Label>Key Name</Label>
        <Input value={name} readOnly />
      </div>

      <div className="space-y-2">
        <Label>API Key</Label>
        <div className="flex gap-2">
          <Input
            value={apiKey}
            readOnly
            className="font-mono text-sm"
            onFocus={(event) => event.target.select()}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

export function CreateApiKeyForm() {
  const router = useRouter();

  const showApiKeyDialog = (apiKey: string, name: string) => {
    const dialogId = dialogManager.add({
      children: (
        <ApiKeySuccessDialog
          apiKey={apiKey}
          name={name}
          onClose={() => dialogManager.remove(dialogId)}
        />
      ),
    });
  };

  const handleCreateKey = () => {
    dialogManager.add({
      title: "Create New API Key",
      description:
        "Choose a descriptive name for your API key to help you identify it later.",
      input: {
        label: "Key Name",
        placeholder: "e.g., My Mobile App, Production Server",
      },
      action: {
        label: "Create Key",
        onClick: async (keyName?: string) => {
          if (keyName) {
            const { data: apiKey, error } = await authClient.apiKey.create({
              name: keyName,
              expiresIn: 60 * 60 * 24 * 365,
            });

            if (error) {
              console.error("Failed to create API key:", error);
              return;
            }

            if (apiKey?.key) {
              showApiKeyDialog(apiKey.key, keyName);
              void router.invalidate();
            }
          }
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create API key</CardTitle>
        <CardDescription>
          Generate a key for CLI, SDK, or server-side requests.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-end border-t">
        <Button onClick={handleCreateKey} size="sm">
          Create API key
        </Button>
      </CardFooter>
    </Card>
  );
}
