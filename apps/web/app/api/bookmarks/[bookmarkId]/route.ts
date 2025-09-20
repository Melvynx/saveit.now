import { deleteBookmark } from "@/lib/database/delete-bookmark";
import { getUserBookmark } from "@/lib/database/get-bookmark";
import { userRoute } from "@/lib/safe-route";
import { SearchCache } from "@/lib/search/search-cache";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = userRoute
  .params(z.object({ bookmarkId: z.string() }))
  .handler(async (req, { params, ctx }) => {
    const bookmark = await getUserBookmark(params.bookmarkId, ctx.user.id);

    if (!bookmark) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ bookmark });
  });

export const PATCH = userRoute
  .params(z.object({ bookmarkId: z.string() }))
  .body(
    z.object({
      starred: z.boolean().optional(),
      read: z.boolean().optional(),
    }),
  )
  .handler(async (req, { params, body, ctx }) => {
    // First, verify the bookmark exists and belongs to the user
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        id: params.bookmarkId,
        userId: ctx.user.id,
      },
      select: {
        id: true,
        type: true,
        read: true,
        starred: true,
      },
    });

    if (!existingBookmark) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 },
      );
    }

    // Validate read functionality for specific bookmark types
    if (body.read !== undefined) {
      if (
        existingBookmark.type !== "ARTICLE" &&
        existingBookmark.type !== "YOUTUBE"
      ) {
        return NextResponse.json(
          { error: "Bookmark does not support read functionality" },
          { status: 400 },
        );
      }
    }

    // Update the bookmark
    const updatedBookmark = await prisma.bookmark.update({
      where: {
        id: params.bookmarkId,
      },
      data: {
        ...(body.starred !== undefined && { starred: body.starred }),
        ...(body.read !== undefined && { read: body.read }),
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Invalidate search cache after bookmark update
    await SearchCache.invalidateBookmarkUpdate(ctx.user.id);

    return NextResponse.json({ bookmark: updatedBookmark });
  });

export const DELETE = userRoute
  .params(z.object({ bookmarkId: z.string() }))
  .handler(async (req, { params, ctx }) => {
    const result = await deleteBookmark({
      id: params.bookmarkId,
      userId: ctx.user.id,
    });

    return NextResponse.json({ success: true, bookmark: result });
  });
