"use client";

import { Button } from "@workspace/ui/components/button";
import { ImageIcon } from "lucide-react";

interface ScreenshotUploadButtonProps {
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

export function ScreenshotUploadButton({ onClick, className = "" }: ScreenshotUploadButtonProps) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${className}`}>
      <Button
        onClick={onClick}
        size="sm"
        className="bg-white/90 text-black hover:bg-white/100 border border-gray-200"
      >
        <ImageIcon className="h-4 w-4 mr-2" />
        Change Image
      </Button>
    </div>
  );
}