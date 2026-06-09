"use client";

import { upfetch } from "@/lib/up-fetch";
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
} from "@workspace/ui/components/form";
import { Textarea } from "@workspace/ui/components/textarea";
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import { CheckCircle2, FileText, Link, Upload } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { type DragEvent, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { URL_REGEX } from "./url-regex";

const Schema = z.object({
  text: z.string().min(1),
});

const ImportResultSchema = z.object({
  totalUrls: z.number(),
  processedUrls: z.number(),
  skippedUrls: z.number(),
  createdBookmarks: z.number(),
  failedBookmarks: z.number(),
  availableSlots: z.number(),
  hasMoreUrls: z.boolean(),
  limitReached: z.boolean(),
});

type ImportResult = z.infer<typeof ImportResultSchema>;
type ImportFormValues = z.infer<typeof Schema>;

type ImportFormProps = {
  onSuccess?: (data: ImportResult) => void;
  onError?: (error: string) => void;
  className?: string;
};

export function ImportForm({ onSuccess, onError, className }: ImportFormProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [urlPreview, setUrlPreview] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const posthog = usePostHog();

  const form = useForm<ImportFormValues>({
    defaultValues: {
      text: "",
    },
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      const text = value.text || "";
      setUrlPreview(extractUrlsFromText(text));
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [form]);

  const extractUrlsFromText = (text: string): string[] => {
    const urls = text.match(URL_REGEX) || [];
    return [...new Set(urls)];
  };

  const handleSubmit = async (data: ImportFormValues) => {
    const validation = Schema.safeParse(data);
    if (!validation.success) {
      toast.error("Paste at least one URL");
      return;
    }

    setIsImporting(true);
    try {
      const urls = extractUrlsFromText(validation.data.text);
      posthog.capture("import_bookmarks", {
        total_urls: urls.length,
      });

      const result = await upfetch("/api/imports", {
        method: "POST",
        body: validation.data,
        schema: ImportResultSchema,
      });

      let message = `Created ${result.createdBookmarks} bookmarks`;
      if (result.failedBookmarks > 0) {
        message += `, ${result.failedBookmarks} failed`;
      }
      if (result.skippedUrls > 0) {
        message += `, ${result.skippedUrls} skipped due to limit`;
      }
      message += ` (${result.processedUrls}/${result.totalUrls} processed)`;

      if (result.limitReached) {
        toast.warning(
          `${message}. You've reached your bookmark limit. Consider upgrading your plan!`,
        );
      } else if (result.failedBookmarks > 0) {
        toast.warning(message);
      } else {
        toast.success(message);
      }

      form.reset();
      onSuccess?.(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while importing";
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const readFileContent = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });

  const handleFileProcess = async (files: FileList) => {
    setIsProcessingFile(true);
    try {
      let allText = "";

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (
          file &&
          (file.type.startsWith("text/") ||
            file.name.endsWith(".txt") ||
            file.name.endsWith(".md") ||
            file.name.endsWith(".html") ||
            file.name.endsWith(".json"))
        ) {
          allText += `${await readFileContent(file)}\n`;
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

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      void handleFileProcess(files);
    }
  };

  const isLoading = isImporting || isProcessingFile;

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
          <Form form={form} onSubmit={handleSubmit}>
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
                        placeholder={"Paste any text containing URLs here, or drag and drop text files...\n\nSupported formats:\n- Plain text with URLs\n- Bookmark export files\n- HTML files\n- JSON files"}
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
                {urlPreview.map((url) => (
                  <li
                    key={url}
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
                  {urlPreview.slice(0, 5).map((url) => (
                    <Typography
                      variant="muted"
                      as="li"
                      key={url}
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

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.html,.json,text/*"
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            void handleFileProcess(files);
          }
        }}
        className="hidden"
      />
    </div>
  );
}
