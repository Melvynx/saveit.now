import { proxyToConvexSite } from "@/lib/convex-site-proxy";
import { createFileRoute } from "@tanstack/react-router";

// Browser-extension screenshot upload (session-cookie auth), forwarded to the
// Convex .site handler (extensionUploadScreenshot).
export const Route = createFileRoute(
  "/api/bookmarks/$bookmarkId/upload-screenshot",
)({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) =>
        proxyToConvexSite(request),
      OPTIONS: async ({ request }: { request: Request }) =>
        proxyToConvexSite(request),
    },
  },
});
