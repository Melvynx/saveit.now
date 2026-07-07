import { proxyToConvexSite } from "@/lib/convex-site-proxy";
import {
  legacyErrorResponse,
  legacyJson,
  normalizeSearchResponse,
  parseBookmarkTypes,
  parseCommaList,
  parseLimit,
  requireLegacySession,
} from "@/lib/legacy-api";
import { fetchAuthAction } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";

// Browser-extension endpoint (session-cookie auth). The session cookie lives
// on the app origin, so extensions call this route and we forward to the
// Convex .site handler (extensionCreateBookmark).
export const Route = createFileRoute("/api/bookmarks")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const user = await requireLegacySession(request);
        if (user instanceof Response) return user;

        const url = new URL(request.url);
        const limit = parseLimit(request, url.searchParams.get("limit"), 20, 50);
        if (limit instanceof Response) return limit;

        try {
          const result = await fetchAuthAction(api.search.actions.search, {
            query: url.searchParams.get("query") ?? undefined,
            cursor: url.searchParams.get("cursor") ?? undefined,
            limit,
            types: parseBookmarkTypes(url.searchParams.get("types")),
            tags: parseCommaList(url.searchParams.get("tags")),
          });

          return legacyJson(normalizeSearchResponse(result), { request });
        } catch (error) {
          return legacyErrorResponse(error, request);
        }
      },
      POST: async ({ request }: { request: Request }) =>
        proxyToConvexSite(request),
      OPTIONS: async ({ request }: { request: Request }) =>
        proxyToConvexSite(request),
    },
  },
});
