"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { CopyButton } from "@/components/copy-button";
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
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [hasAttempted, setHasAttempted] = useState(false);

  const validateUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setHasAttempted(false);
    if (value.trim()) {
      setIsValidUrl(validateUrl(value.trim()));
    } else {
      setIsValidUrl(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      setError("Please enter a URL to analyze");
      return;
    }
    
    if (!validateUrl(trimmedUrl)) {
      setError("Please enter a valid URL (including http:// or https://)");
      setIsValidUrl(false);
      return;
    }

    setHasAttempted(true);
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch("/api/tools/og-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to extract OG images");
      }

      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      
      // Provide helpful error recovery suggestions
      if (errorMessage.includes("fetch")) {
        setError("Unable to access the website. Please check if the URL is correct and the site is accessible.");
      } else if (errorMessage.includes("timeout")) {
        setError("The request timed out. Please try again or check if the website is responding slowly.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tool Input */}
      <Card className="shadow-sm border-2 border-primary/10 hover:border-primary/20 transition-colors">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            URL Analysis Tool
          </CardTitle>
          <CardDescription className="text-base leading-relaxed max-w-2xl mx-auto">
            Enter any website URL to extract Open Graph images, Twitter cards, and social media metadata.
            Get instant previews of how your links will appear across social platforms.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="url" className="text-sm font-semibold text-foreground">
                Website URL
              </Label>
              <div className="relative">
                <Input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com or https://twitter.com/username"
                  required
                  className={`h-12 text-base transition-all duration-200 ${
                    !isValidUrl && url.trim() && hasAttempted
                      ? "border-destructive focus:border-destructive ring-destructive/20"
                      : "border-input focus:border-primary ring-primary/20"
                  }`}
                  aria-describedby={!isValidUrl && url.trim() ? "url-error" : "url-hint"}
                />
                {url.trim() && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValidUrl ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="min-h-[20px]">
                {!isValidUrl && url.trim() && (
                  <Typography variant="muted" className="text-xs text-destructive" id="url-error">
                    Please enter a valid URL starting with http:// or https://
                  </Typography>
                )}
                {(!url.trim() || isValidUrl) && (
                  <Typography variant="muted" className="text-xs" id="url-hint">
                    Try URLs from Twitter, LinkedIn, Medium, GitHub, or any website with social media tags
                  </Typography>
                )}
              </div>
            </div>
            <LoadingButton
              type="submit"
              loading={isLoading}
              disabled={!url.trim() || (!isValidUrl && !!url.trim())}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
            >
              {isLoading ? "Extracting Metadata..." : "Extract OG Images & Meta Tags"}
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="border-l-4 border-l-destructive">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5 shrink-0">
              <span className="text-destructive text-sm">!</span>
            </div>
            <div className="space-y-2 flex-1">
              <Typography variant="small" className="font-medium text-destructive">
                Analysis Failed
              </Typography>
              <Typography variant="small" className="text-destructive/80">
                {error}
              </Typography>
              <Typography variant="muted" className="text-xs">
                <strong>Troubleshooting tips:</strong> Make sure the URL is publicly accessible, includes the protocol (http/https), and the website allows automated access.
              </Typography>
            </div>
          </div>
        </Alert>
      )}

      {/* Results Display */}
      {data && (
        <div className="space-y-8">
          {/* Success Header */}
          <div className="text-center py-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-emerald-600 text-xl">✓</span>
            </div>
            <Typography variant="large" className="font-semibold text-emerald-800 mb-1">
              Metadata Extracted Successfully!
            </Typography>
            <Typography variant="muted" className="text-emerald-700/80">
              Analyzing {new URL(data.url).hostname}
            </Typography>
          </div>

          {/* Primary Image Preview */}
          {data.metadata.images.primary ? (
            <Card className="overflow-hidden border-2 border-primary/10">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-primary">🖼️</span>
                  Primary Social Media Image
                </CardTitle>
                <CardDescription>
                  This is the main image that will be displayed when your URL is shared on social media platforms.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative bg-gradient-to-br from-muted/20 to-muted/40">
                  <Image
                    src={data.metadata.images.primary}
                    alt={data.metadata.openGraph.image.alt || `Social media preview image for ${new URL(data.url).hostname}`}
                    width={800}
                    height={400}
                    className="w-full h-auto max-h-96 object-contain"
                    unoptimized
                  />
                  <div className="absolute top-4 right-4 bg-black/60 text-white px-2 py-1 rounded text-xs">
                    OG Image
                  </div>
                </div>
                <div className="p-6 bg-muted/10">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-2">
                      <Typography variant="small" className="font-semibold text-muted-foreground">Image URL:</Typography>
                      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded">
                        <Typography variant="small" className="break-all text-xs font-mono flex-1">
                          {data.metadata.images.primary}
                        </Typography>
                        <CopyButton
                          text={data.metadata.images.primary!}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          successMessage="Image URL copied to clipboard!"
                          ariaLabel="Copy image URL to clipboard"
                        />
                      </div>
                    </div>
                    {(data.metadata.openGraph.image.width || data.metadata.openGraph.image.height) && (
                      <div className="space-y-2">
                        <Typography variant="small" className="font-semibold text-muted-foreground">Dimensions:</Typography>
                        <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                          <Typography variant="small" className="font-mono text-emerald-800">
                            {data.metadata.openGraph.image.width} × {data.metadata.openGraph.image.height}px
                          </Typography>
                          <Typography variant="muted" className="text-xs text-emerald-600 mt-1">
                            {data.metadata.openGraph.image.width === 1200 && data.metadata.openGraph.image.height === 630 
                              ? "✓ Optimal size" 
                              : "Consider 1200×630 for best results"}
                          </Typography>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed border-muted-foreground/20">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-muted-foreground text-2xl">🖼️</span>
                </div>
                <Typography variant="large" className="font-medium text-muted-foreground mb-2">
                  No Primary Image Found
                </Typography>
                <Typography variant="muted" className="max-w-md mx-auto">
                  This website doesn't have Open Graph or Twitter Card images configured. 
                  Social media platforms will use a default preview.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Social Media Previews */}
          <div className="space-y-6">
            <div className="text-center">
              <Typography variant="h3" className="mb-2">
                Social Media Previews
              </Typography>
              <Typography variant="muted">
                See exactly how your link will appear across different platforms
              </Typography>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Facebook Preview */}
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                  <CardTitle className="flex items-center gap-3 text-blue-800">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">f</span>
                    </div>
                    Facebook Preview
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    How your link appears in Facebook posts and messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="bg-white border border-gray-200 shadow-sm">
                    {data.metadata.images.ogImage ? (
                      <Image
                        src={data.metadata.images.ogImage}
                        alt={`Facebook preview for ${new URL(data.url).hostname}`}
                        width={400}
                        height={200}
                        className="w-full h-48 object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-4xl">🖼️</span>
                      </div>
                    )}
                    <div className="p-4">
                      <Typography variant="small" className="text-gray-500 uppercase mb-1 text-xs font-medium">
                        {data.metadata.openGraph.siteName || new URL(data.url).hostname.toUpperCase()}
                      </Typography>
                      <Typography variant="small" className="font-semibold mb-2 line-clamp-2 text-gray-900">
                        {data.metadata.openGraph.title || data.metadata.page.title || "No title available"}
                      </Typography>
                      <Typography variant="muted" className="text-xs line-clamp-2 text-gray-600">
                        {data.metadata.openGraph.description || data.metadata.page.description || "No description available"}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Twitter Preview */}
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-gradient-to-r from-black to-gray-800 border-b text-white">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-black text-sm font-bold">𝕏</span>
                    </div>
                    Twitter/X Preview
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    How your link appears in Twitter/X posts
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                    {data.metadata.images.twitterImage || data.metadata.images.ogImage ? (
                      <Image
                        src={data.metadata.images.twitterImage || data.metadata.images.ogImage || ''}
                        alt={`Twitter preview for ${new URL(data.url).hostname}`}
                        width={400}
                        height={200}
                        className="w-full h-48 object-cover rounded-t-2xl"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-2xl">
                        <span className="text-gray-400 text-4xl">🖼️</span>
                      </div>
                    )}
                    <div className="p-4">
                      <Typography variant="small" className="font-semibold mb-1 line-clamp-2 text-gray-900">
                        {data.metadata.twitter.title || data.metadata.openGraph.title || data.metadata.page.title || "No title available"}
                      </Typography>
                      <Typography variant="muted" className="text-xs line-clamp-2 mb-2 text-gray-600">
                        {data.metadata.twitter.description || data.metadata.openGraph.description || data.metadata.page.description || "No description available"}
                      </Typography>
                      <Typography variant="muted" className="text-xs text-gray-500 flex items-center gap-1">
                        <span>🔗</span>
                        {new URL(data.url).hostname}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Additional Platform Previews */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">in</span>
                    </div>
                    <Typography variant="small" className="font-semibold text-blue-800">
                      LinkedIn Preview
                    </Typography>
                  </div>
                  <Typography variant="muted" className="text-xs text-blue-700">
                    LinkedIn uses Open Graph tags, so your link will appear similar to the Facebook preview above.
                  </Typography>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">W</span>
                    </div>
                    <Typography variant="small" className="font-semibold text-green-800">
                      WhatsApp Preview
                    </Typography>
                  </div>
                  <Typography variant="muted" className="text-xs text-green-700">
                    WhatsApp also follows Open Graph standards for link previews in chats.
                  </Typography>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Meta Tags */}
          <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary">🏷️</span>
                Complete Meta Tag Analysis
              </CardTitle>
              <CardDescription>
                All social media and Open Graph metadata extracted from the webpage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Open Graph Tags */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
                    <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                      <span className="text-primary text-xs font-bold">OG</span>
                    </div>
                    <Typography variant="large" className="font-semibold text-primary">
                      Open Graph Tags
                    </Typography>
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'og:title', value: data.metadata.openGraph.title, icon: '📝' },
                      { key: 'og:description', value: data.metadata.openGraph.description, icon: '📄' },
                      { key: 'og:site_name', value: data.metadata.openGraph.siteName, icon: '🏢' },
                      { key: 'og:type', value: data.metadata.openGraph.type, icon: '🔖' },
                      { key: 'og:image', value: data.metadata.openGraph.image.url, icon: '🖼️' },
                    ].map((tag, index) => 
                      tag.value ? (
                        <div key={index} className="bg-muted/30 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{tag.icon}</span>
                            <Typography variant="small" className="font-mono font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                              {tag.key}
                            </Typography>
                          </div>
                          <div className="flex items-center gap-2">
                            <Typography variant="small" className={`${tag.key === 'og:image' ? 'break-all font-mono text-xs' : ''} bg-background p-2 rounded border flex-1`}>
                              {tag.value}
                            </Typography>
                            {tag.key === 'og:image' && (
                              <CopyButton
                                text={tag.value!}
                                size="sm"
                                className="h-8 px-2 text-xs"
                                successMessage="OG Image URL copied to clipboard!"
                                ariaLabel="Copy Open Graph image URL to clipboard"
                              />
                            )}
                          </div>
                        </div>
                      ) : null
                    )}
                    {!data.metadata.openGraph.title && !data.metadata.openGraph.description && !data.metadata.openGraph.image.url && (
                      <div className="text-center py-6 text-muted-foreground">
                        <span className="text-2xl mb-2 block">📭</span>
                        <Typography variant="small">No Open Graph tags found</Typography>
                      </div>
                    )}
                  </div>
                </div>

                {/* Twitter Card Tags */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">𝕏</span>
                    </div>
                    <Typography variant="large" className="font-semibold text-gray-900">
                      Twitter Card Tags
                    </Typography>
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'twitter:card', value: data.metadata.twitter.card, icon: '🃏' },
                      { key: 'twitter:title', value: data.metadata.twitter.title, icon: '📝' },
                      { key: 'twitter:description', value: data.metadata.twitter.description, icon: '📄' },
                      { key: 'twitter:site', value: data.metadata.twitter.site, icon: '🐦' },
                      { key: 'twitter:creator', value: data.metadata.twitter.creator, icon: '👤' },
                      { key: 'twitter:image', value: data.metadata.twitter.image.url, icon: '🖼️' },
                    ].map((tag, index) => 
                      tag.value ? (
                        <div key={index} className="bg-muted/30 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{tag.icon}</span>
                            <Typography variant="small" className="font-mono font-medium text-gray-800 bg-gray-100 px-2 py-1 rounded">
                              {tag.key}
                            </Typography>
                          </div>
                          <div className="flex items-center gap-2">
                            <Typography variant="small" className={`${tag.key === 'twitter:image' ? 'break-all font-mono text-xs' : ''} bg-background p-2 rounded border flex-1`}>
                              {tag.value}
                            </Typography>
                            {tag.key === 'twitter:image' && (
                              <CopyButton
                                text={tag.value!}
                                size="sm"
                                className="h-8 px-2 text-xs"
                                successMessage="Twitter Image URL copied to clipboard!"
                                ariaLabel="Copy Twitter image URL to clipboard"
                              />
                            )}
                          </div>
                        </div>
                      ) : null
                    )}
                    {!data.metadata.twitter.card && !data.metadata.twitter.title && !data.metadata.twitter.image.url && (
                      <div className="text-center py-6 text-muted-foreground">
                        <span className="text-2xl mb-2 block">📭</span>
                        <Typography variant="small">No Twitter Card tags found</Typography>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Analysis Summary */}
              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <Typography variant="small" className="font-semibold text-blue-800 mb-2">
                  📊 Quick Analysis Summary
                </Typography>
                <div className="grid md:grid-cols-3 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      data.metadata.images.primary ? 'bg-emerald-500' : 'bg-red-500'
                    }`}></div>
                    <span className={data.metadata.images.primary ? 'text-emerald-700' : 'text-red-700'}>
                      {data.metadata.images.primary ? 'Has social image' : 'Missing social image'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      data.metadata.openGraph.title ? 'bg-emerald-500' : 'bg-red-500'
                    }`}></div>
                    <span className={data.metadata.openGraph.title ? 'text-emerald-700' : 'text-red-700'}>
                      {data.metadata.openGraph.title ? 'Has OG title' : 'Missing OG title'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      data.metadata.openGraph.description ? 'bg-emerald-500' : 'bg-red-500'
                    }`}></div>
                    <span className={data.metadata.openGraph.description ? 'text-emerald-700' : 'text-red-700'}>
                      {data.metadata.openGraph.description ? 'Has description' : 'Missing description'}
                    </span>
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