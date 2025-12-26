import type { MetadataRoute } from "next";

import { getServerUrl } from "@/lib/server-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getServerUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/app/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
