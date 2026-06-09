import { deleteBookmark } from "@/lib/database/delete-bookmark";
import { getUserBookmark } from "@/lib/database/get-bookmark";
import { inngest } from "@/lib/inngest/client";
import { requireUser } from "@/lib/safe-route";
import { SearchCache } from "@/lib/search/search-cache";
import { prisma } from "@workspace/database/client";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const updateBookmarkSchema = z.object({
  starred: z.boolean().optional(),
  read: z.boolean().optional(),
  status: z.literal("PENDING").optional(),
  note: z.string().nullable().optional(),
});

export const Route = createFileRoute("/api/bookmarks/$bookmarkId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const bookmark = await getUserBookmark(params.bookmarkId, user.id);

        if (!bookmark) {
          return Response.json({ error: "Bookmark not found" }, { status: 404 });
        }

        return Response.json({ bookmark });
      },
      PATCH: async ({ request, params }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const body = updateBookmarkSchema.parse(await request.json());
        const existingBookmark = await prisma.bookmark.findUnique({
          where: {
            id: params.bookmarkId,
            userId: user.id,
          },
          select: {
            id: true,
            type: true,
            read: true,
            starred: true,
          },
        });

        if (!existingBookmark) {
          return Response.json({ error: "Bookmark not found" }, { status: 404 });
        }

        if (
          body.read !== undefined &&
          existingBookmark.type !== "ARTICLE" &&
          existingBookmark.type !== "YOUTUBE"
        ) {
          return Response.json(
            { error: "Bookmark does not support read functionality" },
            { status: 400 },
          );
        }

        const updatedBookmark = await prisma.bookmark.update({
          where: { id: params.bookmarkId },
          data: {
            ...(body.starred !== undefined && { starred: body.starred }),
            ...(body.read !== undefined && { read: body.read }),
            ...(body.status !== undefined && { status: body.status }),
            ...(body.note !== undefined && { note: body.note }),
          },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        if (body.status === "PENDING") {
          await inngest.send({
            name: "bookmark/process",
            data: {
              bookmarkId: params.bookmarkId,
              userId: user.id,
            },
          });
        }

        await SearchCache.invalidateBookmarkUpdate(user.id);

        return Response.json({ bookmark: updatedBookmark });
      },
      DELETE: async ({ request, params }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const result = await deleteBookmark({
          id: params.bookmarkId,
          userId: user.id,
        });

        return Response.json({ success: true, bookmark: result });
      },
    },
  },
});
