"use client";

import { Button } from "@workspace/ui/components/button";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface ScreenshotUploaderProps {
  bookmarkId: string;
  onUploadSuccess: (newPreviewUrl: string) => void;
  className?: string;
}

export function ScreenshotUploader({ 
  bookmarkId, 
  onUploadSuccess,
  className = ""
}: ScreenshotUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only image files (JPEG, PNG, WebP, GIF) are allowed");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/bookmarks/${bookmarkId}/upload-screenshot`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Screenshot updated successfully!");
      onUploadSuccess(data.previewUrl);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${className}`}>
      <Button
        onClick={openFilePicker}
        disabled={isUploading}
        size="sm"
        className="bg-white/90 text-black hover:bg-white/100 border border-gray-200"
      >
        {isUploading ? "Uploading..." : "Update Preview"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="sr-only"
      />
    </div>
  );
}