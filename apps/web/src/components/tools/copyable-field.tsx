"use client";

import { copyToClipboard } from "@/lib/tools/tool-utils";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyableFieldProps {
  label: string;
  value?: string | number;
  icon?: React.ReactNode;
}

export function CopyableField({ label, value, icon }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async () => {
    try {
      await copyToClipboard(String(value));
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="flex items-start justify-between p-4 bg-muted/20 rounded-lg border border-border/50">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="mt-1 opacity-60">{icon}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <Typography variant="muted" className="text-xs uppercase tracking-wide font-medium opacity-60">
            {label}
          </Typography>
          <Typography className="text-sm font-medium break-all leading-relaxed">
            {String(value)}
          </Typography>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="ml-3 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}