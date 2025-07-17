"use client";

import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface ApiKeyRowProps {
  apiKey: {
    id: string;
    name: string | null;
    createdAt: Date;
    expiresAt?: Date | null;
    lastRequest?: Date | null;
  };
  onDelete: (keyId: string) => Promise<void>;
}

export function ApiKeyRow({ apiKey, onDelete }: ApiKeyRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      setIsDeleting(true);
      try {
        await onDelete(apiKey.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };


  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <Typography variant="h3" className="font-medium">
            {apiKey.name || "Untitled Key"}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Created {formatDate(apiKey.createdAt)}
          </Typography>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="font-mono text-sm bg-muted px-2 py-1 rounded text-muted-foreground">
            Key hidden for security • Only visible during creation
          </div>
        </div>

        <div className="flex gap-4 text-sm text-muted-foreground">
          {apiKey.expiresAt && (
            <span>Expires {formatDate(apiKey.expiresAt)}</span>
          )}
          {apiKey.lastRequest && (
            <span>Last used {formatDate(apiKey.lastRequest)}</span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}