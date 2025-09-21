"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { useRefreshBookmark } from "app/app/bookmark-page/use-bookmark";
import { useRefreshBookmarks } from "app/app/use-bookmarks";
import { useRef } from "react";
import { toast } from "sonner";
import { upfetch } from "src/lib/up-fetch";
import { z } from "zod";

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

async function uploadScreenshot({
  bookmarkId,
  file,
}: {
  bookmarkId: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("file", file);

  // upfetch is just fetch, but you can swap it for fetch if you want
  const response = await upfetch(
    `/api/bookmarks/${bookmarkId}/upload-screenshot`,
    {
      method: "POST",
      body: formData,
      schema: z.object({
        previewUrl: z.string(),
        success: z.boolean(),
      }),
    },
  );

  return response;
}

export const ScreenshotUploader = ({
  bookmarkId,
  onUploadSuccess,
  className = "",
}: ScreenshotUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refreshBookmarks = useRefreshBookmarks();
  const refreshBookmark = useRefreshBookmark(bookmarkId);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      return uploadScreenshot({ bookmarkId, file });
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
