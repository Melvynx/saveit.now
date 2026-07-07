"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { authClient } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { useMutation } from "convex/react";
import { Check, Copy, Edit3, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ApiKeyRowProps {
  apiKey: {
    id: string;
    name: string | null;
    start?: string | null;
    prefix?: string | null;
    enabled?: boolean | null;
    createdAt: Date | string;
    updatedAt?: Date | string;
    expiresAt?: Date | string | null;
    lastRequest?: Date | string | null;
  };
  onChanged?: () => void;
}

export function ApiKeyRow({ apiKey, onChanged }: ApiKeyRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const displayKey = getDisplayKey(apiKey);
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);
  const renameKey = useMutation(api.apiKeys.mutations.renameKey);

  const handleRename = () => {
    dialogManager.add({
      title: "Rename API key",
      description: "Use a short name that makes this key easy to recognize.",
      input: {
        label: "Key name",
        defaultValue: apiKey.name ?? "",
        placeholder: "Production server",
      },
      action: {
        label: "Save",
        onClick: async (keyName?: string) => {
          const name = keyName?.trim();

          if (!name) {
            throw new Error("Key name is required");
          }

          setIsRenaming(true);
          try {
            await renameKey({ keyId: apiKey.id, name });

            toast.success("API key renamed");
            onChanged?.();
          } finally {
            setIsRenaming(false);
          }
        },
      },
    });
  };

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
              throw new Error(error.message ?? "Failed to delete API key");
            }

            toast.success("API key deleted");
            onChanged?.();
          } finally {
            setIsDeleting(false);
          }
        },
      },
    });
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "Never";

    return new Date(date).toLocaleDateString();
  };

  return (
    <TableRow>
      <TableCell className="min-w-40 pl-4 font-medium">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate">{apiKey.name || "Untitled key"}</span>
          {apiKey.enabled === false ? (
            <span className="text-muted-foreground text-xs">Disabled</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex min-w-52 items-center gap-2">
          <code className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-xs">
            {displayKey}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Copy key for ${apiKey.name || "API key"}`}
            onClick={() => copyToClipboard(displayKey)}
          >
            {isCopied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(apiKey.lastRequest)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(apiKey.createdAt)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : "No expiry"}
      </TableCell>
      <TableCell className="pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Open actions for ${apiKey.name || "API key"}`}
              disabled={isDeleting || isRenaming}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={handleRename}>
              <Edit3 className="size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              data-testid={`delete-api-key-button-${apiKey.name}`}
              variant="destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function getDisplayKey(apiKey: {
  start?: string | null;
  prefix?: string | null;
}) {
  if (apiKey.start) return `${apiKey.start}...`;

  if (apiKey.prefix) return `${apiKey.prefix}_...`;

  return "key_...";
}
