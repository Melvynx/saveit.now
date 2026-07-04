import {
  legacyErrorResponse,
  legacyJson,
  legacyOptions,
  normalizeTagsResponse,
  parseLimit,
  requireLegacySession,
} from "@/lib/legacy-api";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tags")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const user = await requireLegacySession(request);
        if (user instanceof Response) return user;

        const url = new URL(request.url);
        const limit = parseLimit(request, url.searchParams.get("limit"), 10, 50);
        if (limit instanceof Response) return limit;

        try {
          const query = url.searchParams.get("q")?.trim();
          const cursor = url.searchParams.get("cursor") ?? null;
          const result = query
            ? await fetchAuthQuery(api.tags.queries.legacySearch, {
                query,
                cursor,
                limit,
              })
            : await fetchAuthQuery(api.tags.queries.list, {
                paginationOpts: {
                  numItems: limit,
                  cursor,
                },
              });

          return legacyJson(normalizeTagsResponse(result), { request });
        } catch (error) {
          return legacyErrorResponse(error, request);
        }
      },
      OPTIONS: async ({ request }: { request: Request }) =>
        legacyOptions(request),
    },
  },
});
