import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = userRoute
  .params(z.object({ bookmarkId: z.string() }))
  .handler(async (_req, { params, ctx }) => {
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        id: params.bookmarkId,
        userId: ctx.user.id,
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
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 },
      );
    }

    const tags = bookmark.tags.map((t) => t.tag);

    return NextResponse.json({ tags });
  });

export const PATCH = userRoute
  .params(z.object({ bookmarkId: z.string() }))
  .body(z.object({ tags: z.array(z.string()) }))
  .handler(async (_req, { params, body, ctx }) => {
    // Verify bookmark ownership
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        id: params.bookmarkId,
        userId: ctx.user.id,
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!bookmark) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 },
      );
    }

    // Clean and deduplicate tags
    const cleanTags = Array.from(
      new Set(body.tags.filter((tag) => tag && tag.trim().length > 0).map((tag) => tag.trim()))
    );

    const currentTags = bookmark.tags.map((t) => t.tag.name);
    const tagsToAdd = cleanTags.filter((tag) => !currentTags.includes(tag));
    const tagsToRemove = currentTags.filter((tag) => !cleanTags.includes(tag));

    // Remove tags
    await Promise.all(
      tagsToRemove.map(async (tagName) => {
        const tag = await prisma.tag.findUnique({
          where: {
            userId_name: { userId: ctx.user.id, name: tagName },
          },
        });

        if (tag) {
          await prisma.bookmarkTag.delete({
            where: {
              bookmarkId_tagId: {
                bookmarkId: bookmark.id,
                tagId: tag.id,
              },
            },
          });
        }
      }),
    );

    // Add tags
    await Promise.all(
      tagsToAdd.map(async (tagName) => {
        const tag = await prisma.tag.upsert({
          where: {
            userId_name: { userId: ctx.user.id, name: tagName },
          },
          create: { name: tagName, userId: ctx.user.id, type: "USER" },
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

    // Return updated tags
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

    const tags = updatedBookmark!.tags.map((t) => t.tag);

    return NextResponse.json({ tags });
  });