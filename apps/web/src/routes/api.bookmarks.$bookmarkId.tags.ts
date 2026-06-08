import { requireUser } from "@/lib/safe-route";
import { prisma } from "@workspace/database/client";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/bookmarks/$bookmarkId/tags")({
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
            tags: {
              select: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        });

        if (!bookmark) {
          return Response.json({ error: "Bookmark not found" }, { status: 404 });
        }

        return Response.json({ tags: bookmark.tags.map((tag) => tag.tag) });
      },
      PATCH: async ({ request, params }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const body = z.object({ tags: z.array(z.string()) }).parse(await request.json());
        const bookmark = await prisma.bookmark.findUnique({
          where: {
            id: params.bookmarkId,
            userId: user.id,
          },
          include: {
            tags: {
              include: { tag: true },
            },
          },
        });

        if (!bookmark) {
          return Response.json({ error: "Bookmark not found" }, { status: 404 });
        }

        const cleanTags = Array.from(
          new Set(
            body.tags
              .filter((tag) => tag && tag.trim().length > 0)
              .map((tag) => tag.trim()),
          ),
        );
        const currentTags = bookmark.tags.map((tag) => tag.tag.name);
        const tagsToAdd = cleanTags.filter((tag) => !currentTags.includes(tag));
        const tagsToRemove = currentTags.filter((tag) => !cleanTags.includes(tag));

        await Promise.all(
          tagsToRemove.map(async (tagName) => {
            const tag = await prisma.tag.findUnique({
              where: {
                userId_name: { userId: user.id, name: tagName },
              },
            });

            if (!tag) return;

            await prisma.bookmarkTag.delete({
              where: {
                bookmarkId_tagId: {
                  bookmarkId: bookmark.id,
                  tagId: tag.id,
                },
              },
            });
          }),
        );

        await Promise.all(
          tagsToAdd.map(async (tagName) => {
            const tag = await prisma.tag.upsert({
              where: {
                userId_name: { userId: user.id, name: tagName },
              },
              create: { name: tagName, userId: user.id, type: "USER" },
              update: {},
            });

            await prisma.bookmarkTag.create({
              data: {
                bookmarkId: bookmark.id,
                tagId: tag.id,
              },
            });
          }),
        );

        const updatedBookmark = await prisma.bookmark.findUnique({
          where: { id: params.bookmarkId },
          select: {
            tags: {
              select: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        });

        return Response.json({
          tags: updatedBookmark?.tags.map((tag) => tag.tag) ?? [],
        });
      },
    },
  },
});
