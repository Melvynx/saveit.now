"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useZodForm,
} from "@workspace/ui/components/form";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { FileText, Upload } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { usePostHog } from "posthog-js/react";
import { DragEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { importBookmarksAction } from "./imports.action";
import { URL_REGEX } from "./url-regex";

const Schema = z.object({
  text: z.string().min(1),
});

type ImportResult = {
  totalUrls: number;
  processedUrls: number;
  skippedUrls: number;
  createdBookmarks: number;
  failedBookmarks: number;
  availableSlots: number;
  hasMoreUrls: boolean;
  limitReached: boolean;
};

type ImportFormProps = {
  onSuccess?: (data: ImportResult) => void;
  onError?: (error: string) => void;
  className?: string;
};

export function ImportForm({ onSuccess, onError, className }: ImportFormProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [urlPreview, setUrlPreview] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const posthog = usePostHog();

  const form = useZodForm({
    schema: Schema,
    defaultValues: {
      text: "",
    },
  });

  // Update URL preview when text changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      const text = value.text || "";
      const urls = extractUrlsFromText(text);
      setUrlPreview(urls);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const { execute, status } = useAction(importBookmarksAction, {
    onSuccess: ({ data }) => {
      if (!data) return;

      // Enhanced success feedback
      let message = `Created ${data.createdBookmarks} bookmarks`;

      if (data.failedBookmarks > 0) {
        message += `, ${data.failedBookmarks} failed`;
      }

      if (data.skippedUrls > 0) {
        message += `, ${data.skippedUrls} skipped due to limit`;
      }

      message += ` (${data.processedUrls}/${data.totalUrls} processed)`;

      if (data.limitReached) {
        toast.warning(
          message +
            ". You've reached your bookmark limit. Consider upgrading your plan!",
        );
      } else if (data.failedBookmarks > 0) {
        toast.warning(message);
      } else {
        toast.success(message);
      }

      form.reset();
      onSuccess?.(data);
    },
    onError: ({ error }) => {
      const errorMessage =
        error.serverError?.message ||
        error.validationErrors?._errors?.join(", ") ||
        "An error occurred while importing";
      toast.error(errorMessage);
      onError?.(errorMessage);
    },
    onExecute: () => {
      const urls = extractUrlsFromText(form.getValues("text"));
      posthog.capture("import_bookmarks", {
        total_urls: urls.length,
      });
    },
  });

  const extractUrlsFromText = (text: string): string[] => {
    const urls = text.match(URL_REGEX) || [];
    return [...new Set(urls)];
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleFileProcess = async (files: FileList) => {
    setIsProcessingFile(true);
    try {
      let allText = "";

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);

        // Only process text files
        if (
          file &&
          (file.type.startsWith("text/") ||
            file.name.endsWith(".txt") ||
            file.name.endsWith(".md") ||
            file.name.endsWith(".html") ||
            file.name.endsWith(".json"))
        ) {
          const content = await readFileContent(file);
          allText += content + "\n";
        }
      }

      if (allText.trim()) {
        const urls = extractUrlsFromText(allText);
        const currentText = form.getValues("text");
        const newText = currentText
          ? `${currentText}\n${urls.join("\n")}`
          : urls.join("\n");

        form.setValue("text", newText);
        toast.success(`Found ${urls.length} URLs in ${files.length} file(s)`);
      } else {
        toast.error("No URLs found in the uploaded files");
      }
    } catch (error) {
      toast.error("Failed to process files");
      console.error("File processing error:", error);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileProcess(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files);
    }
  };

  const isLoading = status === "executing" || isProcessingFile;

  return (
    <div className={cn("relative", className)}>
      <Form form={form} onSubmit={async (data) => execute(data)}>
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg transition-all duration-200",
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="p-6">
                <FormLabel className="flex items-center gap-2">
                  <FileText className="size-4" />
                  Paste your text containing URLs or drag files here
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Paste any text containing URLs here, or drag and drop text files..."
                    className="min-h-[200px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />

                <div className="flex items-center gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Upload className="size-4 mr-2" />
                    Choose Files
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Supports .txt, .md, .html, .json files
                  </span>
                </div>
              </FormItem>
            )}
          />

          {/* Drag Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <Upload className="size-12 text-primary mx-auto mb-2" />
                <p className="text-lg font-medium text-primary">
                  Drop files here
                </p>
                <p className="text-sm text-muted-foreground">
                  We'll extract URLs from your files
                </p>
              </div>
            </div>
          )}
        </div>

        {/* URL Preview */}
        {urlPreview.length > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Found {urlPreview.length} unique URL
                {urlPreview.length !== 1 ? "s" : ""}
              </span>
              {urlPreview.length > 500 && (
                <span className="text-xs text-destructive font-medium">
                  Max 500 URLs per import
                </span>
              )}
            </div>
            {urlPreview.length <= 10 ? (
              <ul className="text-xs space-y-1">
                {urlPreview.map((url, index) => (
                  <li key={index} className="truncate text-muted-foreground">
                    {url}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground">
                <p>First 5 URLs:</p>
                <ul className="space-y-1 mb-2">
                  {urlPreview.slice(0, 5).map((url, index) => (
                    <li key={index} className="truncate">
                      {url}
                    </li>
                  ))}
                </ul>
                <p>... and {urlPreview.length - 5} more</p>
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="mt-4 w-full"
          disabled={isLoading || urlPreview.length === 0}
        >
          {isLoading
            ? "Processing..."
            : urlPreview.length > 500
              ? `Import first 500 URLs`
              : `Import ${urlPreview.length} URL${urlPreview.length !== 1 ? "s" : ""}`}
        </Button>
      </Form>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.html,.json,text/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}
