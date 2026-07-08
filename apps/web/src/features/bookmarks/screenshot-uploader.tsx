"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

interface ScreenshotUploaderProps {
  bookmarkId: string;
  onUploadSuccess: (newPreviewUrl: string) => void;
  className?: string;
}

const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export const ScreenshotUploader = ({
  bookmarkId,
  onUploadSuccess,
  className = "",
}: ScreenshotUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadBookmarkScreenshot = useAction(
    api.files.actions.uploadBookmarkScreenshot,
  );

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const data = await uploadBookmarkScreenshot({
        bookmarkId: bookmarkId as Id<"bookmarks">,
        fileData: buffer,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      toast.success("Screenshot updated successfully!");
      onUploadSuccess(data.previewUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 2MB");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only image files (JPEG, PNG, WebP, GIF) are allowed");
      return;
    }

    void uploadFile(file);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "absolute top-4 right-4 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100",
        className,
      )}
    >
      <Button onClick={openFilePicker} disabled={isUploading} size="sm">
        {isUploading ? "Uploading..." : "Update Preview"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(",")}
        onChange={handleFileChange}
        className="sr-only"
      />
    </div>
  );
};
