"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ApiKeyRowProps {
  apiKey: {
    id: string;
    name: string | null;
    createdAt: Date;
    expiresAt?: Date | null;
    lastRequest?: Date | null;
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

            router.refresh();
          } finally {
            setIsDeleting(false);
          }
        },
      },
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center justify-between py-2 px-1 border-b border-border last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center gap-3">
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
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
