/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@workspace/ui/components/button";
import { useFileUpload } from "@workspace/ui/hooks/use-file-upload";
import { CircleUserRoundIcon, XIcon } from "lucide-react";

export function AvatarUploader(props: {
  onImageChange: (file: File) => void;
  currentAvatar?: string | null;
}) {
  const [
    { files, isDragging },
    {
      removeFile,
      openFileDialog,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
    },
  ] = useFileUpload({
    accept: "image/*",
    onFilesAdded(addedFiles) {
      const firstFile = addedFiles[0];
      if (firstFile?.file instanceof File) {
        props.onImageChange(firstFile.file);
      }
    },
  });

  const previewUrl = files[0]?.preview || props.currentAvatar || null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex">
        {/* Drop area */}
        <button
          className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 has-disabled:pointer-events-none has-disabled:opacity-50 relative flex size-16 items-center justify-center overflow-hidden rounded-full border border-dashed outline-none transition-colors focus-visible:ring-[3px] has-[img]:border-none"
          onClick={openFileDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          aria-label={previewUrl ? "Change image" : "Upload image"}
        >
          {previewUrl ? (
            <img
              className="size-full object-cover"
              src={previewUrl}
              alt={files[0]?.file?.name || "Uploaded image"}
              width={64}
              height={64}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div aria-hidden="true">
              <CircleUserRoundIcon className="size-4 opacity-60" />
            </div>
          )}
        </button>
        {previewUrl && (
          <Button
            onClick={() => removeFile(files[0]?.id ?? "")}
            size="icon"
            className="border-background focus-visible:border-background absolute -right-1 -top-1 size-6 rounded-full border-2 shadow-none"
            aria-label="Remove image"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Upload image file"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
