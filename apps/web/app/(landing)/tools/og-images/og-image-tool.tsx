"use client";

import { LoadingButton } from "@/features/form/loading-button";
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter Website URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <LoadingButton
            type="submit"
            loading={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Extract OG Images & Meta Tags
          </LoadingButton>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {data && (
        <div className="space-y-6">
          {/* Primary Image Preview */}
          {data.metadata.images.primary && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Primary Social Media Image
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <Image
                  src={data.metadata.images.primary}
                  alt={data.metadata.openGraph.image.alt || "OG Image"}
                  width={800}
                  height={400}
                  className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-900"
                  unoptimized
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Image URL:</span>
                  <p className="break-all">{data.metadata.images.primary}</p>
                </div>
                {(data.metadata.openGraph.image.width || data.metadata.openGraph.image.height) && (
                  <div>
                    <span className="font-medium">Dimensions:</span>
                    <p>
                      {data.metadata.openGraph.image.width} × {data.metadata.openGraph.image.height} pixels
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social Media Previews */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Facebook Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                📘 Facebook Preview
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {data.metadata.images.ogImage && (
                  <Image
                    src={data.metadata.images.ogImage}
                    alt="Facebook preview"
                    width={400}
                    height={160}
                    className="w-full h-40 object-cover bg-gray-100 dark:bg-gray-900"
                    unoptimized
                  />
                )}
                <div className="p-4 bg-gray-50 dark:bg-gray-900">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                    {data.metadata.openGraph.siteName || new URL(data.url).hostname}
                  </p>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                    {data.metadata.openGraph.title || data.metadata.page.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {data.metadata.openGraph.description || data.metadata.page.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Twitter Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🐦 Twitter/X Preview
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {data.metadata.images.twitterImage && (
                  <Image
                    src={data.metadata.images.twitterImage}
                    alt="Twitter preview"
                    width={400}
                    height={160}
                    className="w-full h-40 object-cover bg-gray-100 dark:bg-gray-900"
                    unoptimized
                  />
                )}
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                    {data.metadata.twitter.title || data.metadata.openGraph.title || data.metadata.page.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {data.metadata.twitter.description || data.metadata.openGraph.description || data.metadata.page.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new URL(data.url).hostname}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Meta Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              All Extracted Meta Tags
            </h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Open Graph Tags */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Open Graph Tags</h4>
                <div className="space-y-3">
                  {data.metadata.openGraph.title && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">og:title</span>
                      <p className="text-sm text-gray-900 dark:text-white">{data.metadata.openGraph.title}</p>
                    </div>
                  )}
                  {data.metadata.openGraph.description && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">og:description</span>
                      <p className="text-sm text-gray-900 dark:text-white">{data.metadata.openGraph.description}</p>
                    </div>
                  )}
                  {data.metadata.openGraph.siteName && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">og:site_name</span>
                      <p className="text-sm text-gray-900 dark:text-white">{data.metadata.openGraph.siteName}</p>
                    </div>
                  )}
                  {data.metadata.openGraph.type && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">og:type</span>
                      <p className="text-sm text-gray-900 dark:text-white">{data.metadata.openGraph.type}</p>
                    </div>
                  )}
                  {data.metadata.openGraph.image.url && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">og:image</span>
                      <p className="text-sm text-gray-900 dark:text-white break-all">{data.metadata.openGraph.image.url}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Twitter Card Tags */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Twitter Card Tags</h4>
                <div className="space-y-3">
                  {data.metadata.twitter.card && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">twitter:card</span>
                      <p className="text-sm text-gray-900 dark:text-white">{data.metadata.twitter.card}</p>
                    </div>
                  )}
                  {data.metadata.twitter.title && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">twitter:title</span>
                      <p className="text-sm text-gray-900 dark:text-white">{data.metadata.twitter.title}</p>
                    </div>
                  )}
                  {data.metadata.twitter.description && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">twitter:description</span>
                      <p className="text-sm text-gray-900 dark:text-white">{data.metadata.twitter.description}</p>
                    </div>
                  )}
                  {data.metadata.twitter.site && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">twitter:site</span>
                      <p className="text-sm text-gray-900 dark:text-white">{data.metadata.twitter.site}</p>
                    </div>
                  )}
                  {data.metadata.twitter.creator && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">twitter:creator</span>
                      <p className="text-sm text-gray-900 dark:text-white">{data.metadata.twitter.creator}</p>
                    </div>
                  )}
                  {data.metadata.twitter.image.url && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">twitter:image</span>
                      <p className="text-sm text-gray-900 dark:text-white break-all">{data.metadata.twitter.image.url}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}