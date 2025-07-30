"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { Alert } from "@workspace/ui/components/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Typography } from "@workspace/ui/components/typography";
import Image from "next/image";
import { useState } from "react";

interface OGImageData {
  url: string;
  metadata: {
    openGraph: {
      title?: string;
      description?: string;
      siteName?: string;
      type?: string;
      image: {
        url?: string;
        alt?: string;
        width?: number;
        height?: number;
      };
    };
    twitter: {
      card?: string;
      title?: string;
      description?: string;
      site?: string;
      creator?: string;
      image: {
        url?: string;
        alt?: string;
      };
    };
    page: {
      title?: string;
      description?: string;
    };
    images: {
      ogImage?: string;
      twitterImage?: string;
      primary?: string;
    };
  };
}

export function OGImageTool() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState<OGImageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch("/api/tools/og-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to extract OG images");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tool Input */}
      <Card>
        <CardHeader>
          <CardTitle>URL Analysis Tool</CardTitle>
          <CardDescription>
            Enter any website URL to extract Open Graph images, Twitter cards, and social media metadata.
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
              loading={isLoading}
              className="w-full"
              size="lg"
            >
              Extract OG Images & Meta Tags
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <Typography variant="small">{error}</Typography>
        </Alert>
      )}

      {/* Results Display */}
      {data && (
        <div className="space-y-8">
          {/* Primary Image Preview */}
          {data.metadata.images.primary && (
            <Card>
              <CardHeader>
                <CardTitle>Primary Social Media Image</CardTitle>
                <CardDescription>
                  This is the main image that will be displayed when your URL is shared on social media platforms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  <Image
                    src={data.metadata.images.primary}
                    alt={data.metadata.openGraph.image.alt || "OG Image"}
                    width={800}
                    height={400}
                    className="w-full h-auto max-h-96 object-contain"
                    unoptimized
                  />
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Typography variant="small" className="font-medium">Image URL:</Typography>
                    <Typography variant="muted" className="break-all text-xs">{data.metadata.images.primary}</Typography>
                  </div>
                  {(data.metadata.openGraph.image.width || data.metadata.openGraph.image.height) && (
                    <div className="space-y-2">
                      <Typography variant="small" className="font-medium">Dimensions:</Typography>
                      <Typography variant="muted">
                        {data.metadata.openGraph.image.width} × {data.metadata.openGraph.image.height} pixels
                      </Typography>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Social Media Previews */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Facebook Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📘 Facebook Preview
                </CardTitle>
                <CardDescription>How your link will appear when shared on Facebook</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  {data.metadata.images.ogImage && (
                    <Image
                      src={data.metadata.images.ogImage}
                      alt="Facebook preview"
                      width={400}
                      height={160}
                      className="w-full h-40 object-cover bg-muted"
                      unoptimized
                    />
                  )}
                  <div className="p-4 bg-muted/30">
                    <Typography variant="small" className="text-muted-foreground uppercase mb-1">
                      {data.metadata.openGraph.siteName || new URL(data.url).hostname}
                    </Typography>
                    <Typography variant="small" className="font-semibold mb-1 line-clamp-2">
                      {data.metadata.openGraph.title || data.metadata.page.title}
                    </Typography>
                    <Typography variant="muted" className="text-xs line-clamp-2">
                      {data.metadata.openGraph.description || data.metadata.page.description}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Twitter Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🐦 Twitter/X Preview
                </CardTitle>
                <CardDescription>How your link will appear when shared on Twitter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  {data.metadata.images.twitterImage && (
                    <Image
                      src={data.metadata.images.twitterImage}
                      alt="Twitter preview"
                      width={400}
                      height={160}
                      className="w-full h-40 object-cover bg-muted"
                      unoptimized
                    />
                  )}
                  <div className="p-4">
                    <Typography variant="small" className="font-semibold mb-1 line-clamp-2">
                      {data.metadata.twitter.title || data.metadata.openGraph.title || data.metadata.page.title}
                    </Typography>
                    <Typography variant="muted" className="text-xs line-clamp-2 mb-2">
                      {data.metadata.twitter.description || data.metadata.openGraph.description || data.metadata.page.description}
                    </Typography>
                    <Typography variant="muted" className="text-xs">
                      {new URL(data.url).hostname}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Meta Tags */}
          <Card>
            <CardHeader>
              <CardTitle>All Extracted Meta Tags</CardTitle>
              <CardDescription>Complete list of social media and Open Graph metadata found on the page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Open Graph Tags */}
                <div className="space-y-4">
                  <Typography variant="large" className="font-semibold">Open Graph Tags</Typography>
                  <div className="space-y-3">
                    {data.metadata.openGraph.title && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">og:title</Typography>
                        <Typography variant="small">{data.metadata.openGraph.title}</Typography>
                      </div>
                    )}
                    {data.metadata.openGraph.description && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">og:description</Typography>
                        <Typography variant="small">{data.metadata.openGraph.description}</Typography>
                      </div>
                    )}
                    {data.metadata.openGraph.siteName && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">og:site_name</Typography>
                        <Typography variant="small">{data.metadata.openGraph.siteName}</Typography>
                      </div>
                    )}
                    {data.metadata.openGraph.type && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">og:type</Typography>
                        <Typography variant="small">{data.metadata.openGraph.type}</Typography>
                      </div>
                    )}
                    {data.metadata.openGraph.image.url && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">og:image</Typography>
                        <Typography variant="small" className="break-all">{data.metadata.openGraph.image.url}</Typography>
                      </div>
                    )}
                  </div>
                </div>

                {/* Twitter Card Tags */}
                <div className="space-y-4">
                  <Typography variant="large" className="font-semibold">Twitter Card Tags</Typography>
                  <div className="space-y-3">
                    {data.metadata.twitter.card && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">twitter:card</Typography>
                        <Typography variant="small">{data.metadata.twitter.card}</Typography>
                      </div>
                    )}
                    {data.metadata.twitter.title && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">twitter:title</Typography>
                        <Typography variant="small">{data.metadata.twitter.title}</Typography>
                      </div>
                    )}
                    {data.metadata.twitter.description && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">twitter:description</Typography>
                        <Typography variant="small">{data.metadata.twitter.description}</Typography>
                      </div>
                    )}
                    {data.metadata.twitter.site && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">twitter:site</Typography>
                        <Typography variant="small">{data.metadata.twitter.site}</Typography>
                      </div>
                    )}
                    {data.metadata.twitter.creator && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">twitter:creator</Typography>
                        <Typography variant="small">{data.metadata.twitter.creator}</Typography>
                      </div>
                    )}
                    {data.metadata.twitter.image.url && (
                      <div className="space-y-1">
                        <Typography variant="small" className="font-medium text-muted-foreground">twitter:image</Typography>
                        <Typography variant="small" className="break-all">{data.metadata.twitter.image.url}</Typography>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}