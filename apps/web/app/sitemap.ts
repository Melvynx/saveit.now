import type { MetadataRoute } from "next";

import { getServerUrl } from "@/lib/server-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getServerUrl();

  const toolPages = [
    "/tools",
    "/tools/og-images",
    "/tools/extract-content",
    "/tools/extract-metadata",
    "/tools/extract-favicons",
    "/tools/youtube-metadata",
  ];

  const staticPages = ["/", "/ios", "/pricing", "/posts"];

  const allPages = [...staticPages, ...toolPages];

  return allPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route.startsWith("/tools") ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route.startsWith("/tools") ? 0.9 : 0.8,
  }));
}
