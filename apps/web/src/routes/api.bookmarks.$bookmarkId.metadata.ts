import { getFaviconUrl } from "@/lib/inngest/bookmark.utils";
import { requireUser } from "@/lib/safe-route";
import { prisma } from "@workspace/database/client";
import { createFileRoute } from "@tanstack/react-router";
import * as cheerio from "cheerio";

export const Route = createFileRoute("/api/bookmarks/$bookmarkId/metadata")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const bookmark = await prisma.bookmark.findUnique({
          where: {
            id: params.bookmarkId,
            userId: user.id,
          },
          select: {
            url: true,
            title: true,
            faviconUrl: true,
          },
        });

        if (!bookmark) {
          return Response.json({ error: "Bookmark not found" }, { status: 404 });
        }

        try {
          const response = await fetch(bookmark.url);
          const html = await response.text();
          const $ = cheerio.load(html);

          return Response.json({
            title: $("title").text() || bookmark.title || new URL(bookmark.url).hostname,
            faviconUrl: getFaviconUrl($, bookmark.url) || bookmark.faviconUrl || "",
          });
        } catch {
          return Response.json({
            title: bookmark.title || new URL(bookmark.url).hostname,
            faviconUrl: bookmark.faviconUrl || "",
          });
        }
      },
    },
  },
});
