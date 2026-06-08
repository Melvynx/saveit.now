import { parseBookmarkBody } from "@/lib/api/parse-bookmark-body";
import { requireUser } from "@/lib/safe-route";
import { BookmarkValidationError } from "@/lib/database/bookmark-validation";
import { createBookmark } from "@/lib/database/create-bookmark";
import { cachedAdvancedSearch } from "@/lib/search/cached-search";
import { BookmarkType } from "@workspace/database";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/bookmarks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const url = new URL(request.url);
        const validBookmarkTypes = Object.values(BookmarkType);
        const types = (url.searchParams.get("types") ?? "")
          .split(",")
          .filter(Boolean)
          .filter((type): type is BookmarkType =>
            validBookmarkTypes.includes(type as BookmarkType),
          );
        const tags = (url.searchParams.get("tags") ?? "")
          .split(",")
          .filter(Boolean);
        const limitResult = z.coerce.number().int().min(1).max(50).safeParse(
          url.searchParams.get("limit") ?? 20,
        );

        if (!limitResult.success) {
          return Response.json(
            { error: "Invalid query", errors: limitResult.error.issues },
            { status: 400 },
          );
        }

        const specialFilters = (url.searchParams.get("special") ?? "")
          .split(",")
          .filter(Boolean)
          .filter((filter): filter is "READ" | "UNREAD" | "STAR" =>
            ["READ", "UNREAD", "STAR"].includes(filter),
          );

        const searchResults = await cachedAdvancedSearch({
          userId: user.id,
          query: url.searchParams.get("query") ?? undefined,
          tags,
          types,
          specialFilters,
          limit: limitResult.data,
          cursor: url.searchParams.get("cursor") ?? undefined,
          matchingDistance: Number(url.searchParams.get("matchingDistance") ?? 0.1),
        });

        return Response.json(searchResults);
      },
      POST: async ({ request }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        try {
          const result = await parseBookmarkBody(request, user.id);
          if (!result.success) return result.error;

          const bookmark = await createBookmark({
            url: result.data.url,
            userId: user.id,
            transcript: result.data.transcript,
            metadata: result.data.metadata,
          });

          return Response.json({ status: "ok", bookmark });
        } catch (error) {
          if (error instanceof BookmarkValidationError) {
            return Response.json({ error: error.message }, { status: 400 });
          }

          throw error;
        }
      },
    },
  },
});
