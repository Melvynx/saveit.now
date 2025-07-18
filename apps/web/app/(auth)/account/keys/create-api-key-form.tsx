"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { authClient } from "@/lib/auth-client";
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
import { useRouter } from "next/navigation";
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
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Typography variant="h3">API Key Created Successfully!</Typography>
        <Typography variant="muted">
          Your API key has been created. Make sure to copy it now - you won't be
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
            onFocus={(e) => e.target.select()}
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
              expiresIn: 60 * 60 * 24 * 365, // 1 year
            });

            if (error) {
              console.error("Failed to create API key:", error);
              return;
            }

            if (apiKey?.key) {
              showApiKeyDialog(apiKey.key, keyName);
              router.refresh();
            }
          }
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New API Key</CardTitle>
        <CardDescription>
          Generate a new API key to access the SaveIt.now API.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button onClick={handleCreateKey}>Create API Key</Button>
      </CardFooter>
    </Card>
  );
}
