import {
  legacyErrorResponse,
  legacyJson,
  legacyOptions,
  normalizeLegacyBookmark,
  requireLegacySession,
} from "@/lib/legacy-api";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";

function getBookmarkId(request: Request): string {
  const pathname = new URL(request.url).pathname;
  const parts = pathname.split("/");
  return decodeURIComponent(parts[parts.length - 1] ?? "");
}

async function getResolvedBookmark(request: Request) {
  const bookmarkId = getBookmarkId(request);
  return await fetchAuthQuery(api.bookmarks.queries.getByIdOrLegacyId, {
    id: bookmarkId,
  });
}

export const Route = createFileRoute("/api/bookmarks/$bookmarkId")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const user = await requireLegacySession(request);
        if (user instanceof Response) return user;

        try {
          const bookmark = await getResolvedBookmark(request);
          return legacyJson(
            { bookmark: normalizeLegacyBookmark(bookmark) },
            { request },
          );
        } catch (error) {
          return legacyErrorResponse(error, request);
        }
      },
      PATCH: async ({ request }: { request: Request }) => {
        const user = await requireLegacySession(request);
        if (user instanceof Response) return user;

        try {
          const body = (await request.json()) as {
            starred?: unknown;
            read?: unknown;
            note?: unknown;
            status?: unknown;
          };
          const patch: {
            starred?: boolean;
            read?: boolean;
            note?: string | null;
          } = {};
          if (body.starred !== undefined) patch.starred = body.starred === true;
          if (body.read !== undefined) patch.read = body.read === true;
          if (body.note !== undefined) {
            if (typeof body.note !== "string" && body.note !== null) {
              throw new Error("validation: note must be a string or null");
            }
            patch.note = body.note;
          }
          if (body.status !== undefined && body.status !== "PENDING") {
            throw new Error("validation: status must be PENDING");
          }

          const existing = await getResolvedBookmark(request);
          let updated = existing;

          if (Object.keys(patch).length > 0) {
            updated = await fetchAuthMutation(api.bookmarks.mutations.update, {
              id: existing.id as Id<"bookmarks">,
              patch,
            });
          }

          if (body.status === "PENDING") {
            await fetchAuthMutation(api.bookmarks.mutations.reprocess, {
              id: existing.id as Id<"bookmarks">,
            });
            updated = await getResolvedBookmark(request);
          }

          return legacyJson(
            { bookmark: normalizeLegacyBookmark(updated) },
            { request },
          );
        } catch (error) {
          return legacyErrorResponse(error, request);
        }
      },
      DELETE: async ({ request }: { request: Request }) => {
        const user = await requireLegacySession(request);
        if (user instanceof Response) return user;

        try {
          const existing = await getResolvedBookmark(request);
          const result = await fetchAuthMutation(api.bookmarks.mutations.remove, {
            id: existing.id as Id<"bookmarks">,
          });

          return legacyJson({ success: true, bookmark: result }, { request });
        } catch (error) {
          return legacyErrorResponse(error, request);
        }
      },
      OPTIONS: async ({ request }: { request: Request }) =>
        legacyOptions(request),
    },
  },
});
