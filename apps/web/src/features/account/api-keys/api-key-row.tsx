"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface ApiKeyRowProps {
  apiKey: {
    id: string;
    name: string | null;
    createdAt: Date | string;
    expiresAt?: Date | string | null;
    lastRequest?: Date | string | null;
  };
}

export function ApiKeyRow({ apiKey }: ApiKeyRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    dialogManager.add({
      title: "Delete API Key",
      description:
        "Are you sure you want to delete this API key? This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          setIsDeleting(true);
          try {
            const { error } = await authClient.apiKey.delete({
              keyId: apiKey.id,
            });

            if (error) {
              console.error("Failed to delete API key:", error);
              return;
            }

            void router.invalidate();
          } finally {
            setIsDeleting(false);
          }
        },
      },
    });
  };

  const formatDate = (date: Date | string) => new Date(date).toLocaleDateString();

  return (
    <div className="border-border flex items-center justify-between gap-4 border-b px-1 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <Typography variant="default" className="font-medium">
            {apiKey.name || "Untitled Key"}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Created {formatDate(apiKey.createdAt)}
          </Typography>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        data-testid={`delete-api-key-button-${apiKey.name}`}
        disabled={isDeleting}
        className="text-destructive hover:text-destructive"
        aria-label={`Delete ${apiKey.name || "API key"}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
