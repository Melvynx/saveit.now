"use client";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Button } from "@workspace/ui/components/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";

interface CopyButtonProps {
  text: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
  successMessage?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function CopyButton({
  text,
  variant = "ghost",
  size = "sm",
  className,
  showText = false,
  successMessage,
  ariaLabel,
  disabled = false,
}: CopyButtonProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);

  const handleCopy = async () => {
    if (disabled || !text) return;
    
    try {
      copyToClipboard(text);
      toast.success(successMessage || "Copied to clipboard!", {
        duration: 2000,
      });
    } catch (error) {
      toast.error("Failed to copy to clipboard");
      console.error("Copy failed:", error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCopy();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
      disabled={disabled || !text}
      className={cn(
        "transition-all duration-200 shrink-0",
        isCopied && "text-emerald-600 hover:text-emerald-700",
        className
      )}
      aria-label={ariaLabel || `Copy ${text.length > 50 ? 'text' : text} to clipboard`}
      title={isCopied ? "Copied!" : "Copy to clipboard"}
    >
      {isCopied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {showText && (
        <span className="ml-2">
          {isCopied ? "Copied!" : "Copy"}
        </span>
      )}
    </Button>
  );
}