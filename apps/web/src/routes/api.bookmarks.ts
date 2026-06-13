import { proxyToConvexSite } from "@/lib/convex-site-proxy";
import { createFileRoute } from "@tanstack/react-router";

// Browser-extension endpoint (session-cookie auth). The session cookie lives
// on the app origin, so extensions call this route and we forward to the
// Convex .site handler (extensionCreateBookmark).
export const Route = createFileRoute("/api/bookmarks")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) =>
        proxyToConvexSite(request),
      OPTIONS: async ({ request }: { request: Request }) =>
        proxyToConvexSite(request),
    },
  },
});
