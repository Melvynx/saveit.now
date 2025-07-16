"use client";

import { Button } from "@workspace/ui/components/button";
import { useFileUpload } from "@workspace/ui/hooks/use-file-upload";
import { UploadIcon, XIcon, LoaderIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface ScreenshotUploaderProps {
  bookmarkId: string;
  currentPreviewUrl?: string;
  onUploadSuccess: (newPreviewUrl: string) => void;
  onCancel: () => void;
}

export function ScreenshotUploader({ 
  bookmarkId, 
  currentPreviewUrl, 
  onUploadSuccess, 
  onCancel 
}: ScreenshotUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const [
    { files, isDragging, errors },
    {
      removeFile,
      openFileDialog,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      clearErrors,
    },
  ] = useFileUpload({
    accept: "image/jpeg,image/jpg,image/png,image/webp,image/gif",
    maxSize: MAX_FILE_SIZE,
    onFilesAdded: async (addedFiles) => {
      const file = addedFiles[0];
      if (file?.file instanceof File) {
        await handleUpload(file.file);
      }
    },
  });

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    clearErrors();

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
    }
  };

  const previewUrl = files[0]?.preview || currentPreviewUrl;

  return (
    <div className="border rounded-lg p-4 bg-background/95 backdrop-blur-sm shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Upload Custom Screenshot</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
          ${isUploading ? "pointer-events-none opacity-60" : "hover:border-primary/50 hover:bg-primary/5"}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="flex items-center gap-2">
              <LoaderIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm">Uploading...</span>
            </div>
          </div>
        )}

        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <Image
                src={previewUrl}
                alt="Preview"
                width={300}
                height={128}
                className="max-w-full max-h-32 rounded object-cover"
              />
              {files[0] && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                  onClick={() => removeFile(files[0]?.id ?? "")}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
            {!files[0] && (
              <Button onClick={openFileDialog} disabled={isUploading}>
                <UploadIcon className="h-4 w-4 mr-2" />
                Choose Different Image
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <UploadIcon className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Drop your screenshot here, or{" "}
                <button
                  type="button"
                  onClick={openFileDialog}
                  className="text-primary hover:underline"
                  disabled={isUploading}
                >
                  browse files
                </button>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports JPEG, PNG, WebP, GIF (max 2MB)
              </p>
            </div>
          </div>
        )}

        <input {...getInputProps()} className="sr-only" />
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-xs">
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}