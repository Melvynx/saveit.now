"use client";

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
import { Typography } from "@workspace/ui/components/typography";
import { Archive } from "lucide-react";
import { useState } from "react";
import { extractFaviconsResponseSchema } from "../../../api/tools/extract-favicons/extract-favicons.types";
import { FaviconCard } from "./favicon-card";

export function ExtractFaviconsTool() {
  const [url, setUrl] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);

  const mutation = useMutation({
    mutationFn: async (urlToFetch: string) => {
      return upfetch("/api/tools/extract-favicons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        schema: extractFaviconsResponseSchema,
        body: JSON.stringify({ url: urlToFetch }),
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    mutation.mutate(url.trim());
  };

  const handleDownloadAll = async () => {
    if (!mutation.data) return;

    setDownloadingAll(true);
    try {
      const validFavicons = mutation.data.favicons.filter((f) => f.isValid);

      for (const favicon of validFavicons) {
        const filename = generateFilenameFromURL(
          mutation.data.url,
          `favicon-${favicon.size || favicon.type}`,
          `.${favicon.format}`,
        );
        await downloadFile(favicon.url, filename);
        // Add a small delay to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("Error downloading favicons:", error);
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tool Input */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Favicon Extraction Tool</CardTitle>
          <CardDescription>
            Extract all favicon variants from any website including Apple touch
            icons, Android icons, and standard favicons in various sizes and
            formats.
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
                placeholder="https://example.com"
                required
              />
            </div>
            <LoadingButton
              type="submit"
              loading={mutation.isPending}
              className="w-full"
              size="lg"
            >
              Extract Favicons
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {mutation.error && (
        <Alert variant="destructive">
          <Typography variant="small">{mutation.error.message}</Typography>
        </Alert>
      )}

      {/* Results Display */}
      {mutation.data && (
        <div className="space-y-8">
          {/* Favicons Gallery */}
          {mutation.data.favicons.filter((f) => f.isValid).length > 0 && (
            <Card>
              <CardHeader className="relative">
                <CardTitle>Favicons</CardTitle>
                <CardDescription>
                  All valid favicon variants found on the website. Recommended
                  ones are highlighted.
                </CardDescription>
                {mutation.data.metadata.validFavicons > 0 && (
                  <Button
                    variant="outline"
                    disabled={downloadingAll}
                    onClick={handleDownloadAll}
                    className="flex items-center gap-2 absolute w-fit right-4 top-0"
                  >
                    <Archive className="h-4 w-4" />
                    Download All ({mutation.data.metadata.validFavicons})
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div
                  className="grid grid-cols-1 gap-4"
                  style={{
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                  }}
                >
                  {mutation.data.favicons
                    .filter((f) => f.isValid)
                    .map((favicon, index) => {
                      const isRecommended =
                        favicon.url ===
                          mutation.data.metadata.standardFavicon?.url ||
                        favicon.url ===
                          mutation.data.metadata.largestIcon?.url ||
                        favicon.url ===
                          mutation.data.metadata.appleTouchIcon?.url ||
                        favicon.url ===
                          mutation.data.metadata.androidIcon?.url ||
                        favicon.url === mutation.data.metadata.svgIcon?.url;

                      return (
                        <FaviconCard
                          key={`${favicon.url}-${index}`}
                          favicon={favicon}
                          index={index}
                          siteUrl={mutation.data.url}
                          isRecommended={isRecommended}
                        />
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {mutation.data.favicons.length === 0 && (
            <Alert>
              <Typography variant="small">
                No favicons were found on this website. The site may not have
                any favicon configured.
              </Typography>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
