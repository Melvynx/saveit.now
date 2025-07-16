"use client";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";

interface ApiKeyRowProps {
  apiKey: {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    expiresAt?: string;
    lastUsed?: string;
  };
  onDelete: (keyId: string) => Promise<void>;
}

export function ApiKeyRow({ apiKey, onDelete }: ApiKeyRowProps) {
  const [showKey, setShowKey] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { copyToClipboard, isCopied } = useCopyToClipboard();

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

  const handleCopy = () => {
    copyToClipboard(apiKey.key);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const maskedKey = apiKey.key.substring(0, 8) + "..." + apiKey.key.slice(-4);

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
          <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
            {showKey ? apiKey.key : maskedKey}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKey(!showKey)}
            className="h-8 w-8 p-0"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {isCopied && (
            <Typography variant="small" className="text-green-600">
              Copied!
            </Typography>
          )}
        </div>

        <div className="flex gap-4 text-sm text-muted-foreground">
          {apiKey.expiresAt && (
            <span>Expires {formatDate(apiKey.expiresAt)}</span>
          )}
          {apiKey.lastUsed && (
            <span>Last used {formatDate(apiKey.lastUsed)}</span>
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