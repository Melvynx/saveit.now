import type { MetadataRoute } from "next";

import { getServerUrl } from "@/lib/server-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getServerUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/app/",
          "/_next/",
          "/signin",
          "/verify",
          "/account",
          "/billing",
          "/upgrade",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
