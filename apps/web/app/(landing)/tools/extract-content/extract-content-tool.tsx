"use client";

import { CopyableField } from "@/components/tools/copyable-field";
import { LoadingButton } from "@/features/form/loading-button";
import { downloadFile, generateFilenameFromURL } from "@/lib/tools";
import { upfetch } from "@/lib/up-fetch";
import { useMutation } from "@tanstack/react-query";
import { Alert } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Typography } from "@workspace/ui/components/typography";
import {
  Clock,
  Download,
  FileText,
  Hash,
  Heading,
  MessageSquareText,
} from "lucide-react";
import { useState } from "react";
import { extractContentResponseSchema } from "../../../api/tools/extract-content/extract-content.types";

export function ExtractContentTool() {
  const [url, setUrl] = useState("");

  const mutation = useMutation({
    mutationFn: async (urlToFetch: string) => {
      return upfetch("/api/tools/extract-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        schema: extractContentResponseSchema,
        body: JSON.stringify({ url: urlToFetch }),
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    mutation.mutate(url.trim());
  };

  const downloadTextFile = () => {
    if (!mutation.data) return;
    const blob = new Blob([mutation.data.content.plainText], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const filename = generateFilenameFromURL(
      mutation.data.url,
      "content",
      ".txt",
    );
    downloadFile(url, filename);
    URL.revokeObjectURL(url);
  };

  const downloadMarkdownFile = () => {
    if (!mutation.data) return;
    const blob = new Blob([mutation.data.content.markdown], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const filename = generateFilenameFromURL(
      mutation.data.url,
      "content",
      ".md",
    );
    downloadFile(url, filename);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Tool Input */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Content Extraction Tool</CardTitle>
          <CardDescription>
            Extract clean, readable content from any webpage. Get both plain
            text and markdown formats with content statistics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                required
              />
            </div>
            <LoadingButton
              type="submit"
              loading={mutation.isPending}
              className="w-full"
              size="lg"
            >
              Extract Content
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {mutation.error && (
        <Alert variant="destructive">
          <Typography variant="small">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "An error occurred"}
          </Typography>
        </Alert>
      )}

      {/* Results Display */}
      {mutation.data && (
        <div className="space-y-8">
          {/* Content Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Content Statistics
              </CardTitle>
              <CardDescription>
                Overview of the extracted content from{" "}
                {mutation.data.metadata.siteName ||
                  new URL(mutation.data.url).hostname}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {mutation.data.content.statistics.wordCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Words</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {mutation.data.content.statistics.charCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Characters
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {mutation.data.content.statistics.paragraphCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Paragraphs
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                    <Clock className="h-5 w-5" />
                    {mutation.data.content.statistics.readingTime}
                  </div>
                  <div className="text-sm text-muted-foreground">Min Read</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Article Metadata */}
          {(mutation.data.metadata.title ||
            mutation.data.metadata.description ||
            mutation.data.metadata.author ||
            mutation.data.metadata.publishedDate) && (
            <Card>
              <CardHeader>
                <CardTitle>Article Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CopyableField
                  label="Title"
                  value={mutation.data.metadata.title}
                  icon={<Heading className="h-4 w-4" />}
                />
                <CopyableField
                  label="Description"
                  value={mutation.data.metadata.description}
                  icon={<MessageSquareText className="h-4 w-4" />}
                />
                {mutation.data.metadata.author && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Author
                    </Label>
                    <Typography className="mt-1">
                      {mutation.data.metadata.author}
                    </Typography>
                  </div>
                )}
                {mutation.data.metadata.publishedDate && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Published
                    </Label>
                    <Typography className="mt-1">
                      {new Date(
                        mutation.data.metadata.publishedDate,
                      ).toLocaleDateString()}
                    </Typography>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Content Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Extracted Content
                  </CardTitle>
                  <CardDescription>
                    Clean, readable content extracted from the webpage
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTextFile}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download .txt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadMarkdownFile}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download .md
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  <TabsTrigger value="text">Plain Text</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Typography variant="h3" className="mb-4">
                      {mutation.data.content.title}
                    </Typography>
                    <hr className="mb-4 border-border" />
                    <div
                      className="whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: mutation.data.content.markdown
                          .replace(/^# .*/gm, "") // Remove h1 headers
                          .replace(/\n/g, "<br/>")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                      }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="markdown" className="mt-4">
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          mutation.data.content.markdown,
                        )
                      }
                      className="absolute top-2 right-2 z-10"
                    >
                      Copy
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
                      <code>{mutation.data.content.markdown}</code>
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="text" className="mt-4">
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          mutation.data.content.plainText,
                        )
                      }
                      className="absolute top-2 right-2 z-10"
                    >
                      Copy
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm whitespace-pre-wrap">
                      <code>{mutation.data.content.plainText}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
