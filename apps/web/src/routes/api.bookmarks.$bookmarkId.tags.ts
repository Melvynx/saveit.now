import { proxyToConvexSite } from "@/lib/convex-site-proxy";
import { createFileRoute } from "@tanstack/react-router";

// Browser-extension quick-tag row (session-cookie auth), forwarded to the
// Convex .site handler (extensionBookmarkTags): GET ?q= for the bookmark's
// tags, suggestions and search matches; POST {add, remove} to change them.
export const Route = createFileRoute("/api/bookmarks/$bookmarkId/tags")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) =>
        proxyToConvexSite(request),
      POST: async ({ request }: { request: Request }) =>
        proxyToConvexSite(request),
      OPTIONS: async ({ request }: { request: Request }) =>
        proxyToConvexSite(request),
    },
  },
});
