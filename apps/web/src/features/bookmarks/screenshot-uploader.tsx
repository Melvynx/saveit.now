"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { useRefreshBookmark } from "@/features/app/bookmark-page/use-bookmark";
import { useRefreshBookmarks } from "@/features/app/use-bookmarks";
import { api } from "@convex/_generated/api";
import { useConvexAction } from "@convex-dev/react-query";
import { useRef } from "react";
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
  const refreshBookmarks = useRefreshBookmarks();
  const refreshBookmark = useRefreshBookmark(bookmarkId);
  const uploadBookmarkScreenshot = useConvexAction(
    api.files.actions.uploadBookmarkScreenshot,
  );

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const buffer = await file.arrayBuffer();
      return uploadBookmarkScreenshot({
        bookmarkId: bookmarkId as Id<"bookmarks">,
        fileData: buffer,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
    },
    onSuccess: (data) => {
      toast.success("Screenshot updated successfully!");
      onUploadSuccess(data.previewUrl);
      refreshBookmarks();
      refreshBookmark();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    },
    onSettled: () => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

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

    mutation.mutate(file);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`absolute top-4 right-4 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${className}`}
    >
      <Button onClick={openFilePicker} disabled={mutation.isPending} size="sm">
        {mutation.isPending ? "Uploading..." : "Update Preview"}
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
