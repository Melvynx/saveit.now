"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import { CheckCircle2, FileText, Link, Upload } from "lucide-react";
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: Schema as any,
    defaultValues: {
      text: "",
    },
  });

  // Update URL preview when text changes
  useEffect(() => {
    const subscription = form.watch((value: z.infer<typeof Schema>) => {
      const text = value.text || "";
      const urls = extractUrlsFromText(text);
      setUrlPreview(urls);
    });
    return () => {
      subscription.unsubscribe();
    };
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
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Import Your Bookmarks
          </CardTitle>
          <CardDescription>
            Paste URLs directly, upload text files, or drag and drop files
            containing bookmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form
            form={form}
            onSubmit={async (data: z.infer<typeof Schema>) => execute(data)}
          >
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
                    <FormLabel className="text-base font-medium">
                      Paste URLs or Text Content
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste any text containing URLs here, or drag and drop text files...\n\nSupported formats:\n• Plain text with URLs\n• Bookmark export files\n• HTML files\n• JSON files"
                        className="min-h-[120px] max-h-[300px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />

                    <div className="flex items-center gap-4 pt-4">
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
                      <div className="text-sm text-muted-foreground">
                        <p>Supports .txt, .md, .html, .json files</p>
                      </div>
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

            <Button
              type="submit"
              className="mt-6 w-full"
              size="lg"
              disabled={isLoading || urlPreview.length === 0}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Import {urlPreview.length} URL
                  {urlPreview.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* URL Preview Card */}
      {urlPreview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="size-5" />
              Preview ({urlPreview.length} URL
              {urlPreview.length !== 1 ? "s" : ""} found)
            </CardTitle>
            <CardDescription>
              These URLs will be imported as bookmarks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {urlPreview.length <= 10 ? (
              <ul className="space-y-2">
                {urlPreview.map((url, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                  >
                    <Link className="size-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-sm">{url}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2">
                <ul className="space-y-1">
                  {urlPreview.slice(0, 5).map((url, index) => (
                    <Typography
                      variant="muted"
                      as="li"
                      key={index}
                      className="flex items-center gap-2 rounded-md"
                    >
                      <Link className="size-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-sm">{url}</span>
                    </Typography>
                  ))}
                </ul>
                <Typography variant="muted">
                  ... and {urlPreview.length - 5} more URLs
                </Typography>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
