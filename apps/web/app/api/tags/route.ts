import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

const TagSchema = z.object({
  name: z.string(),
});

export const GET = userRoute.handler(async (req, { ctx }) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  const tags = await prisma.tag.findMany({
    where: {
      userId: ctx.user.id,
      ...(query && {
        name: {
          contains: query,
          mode: "insensitive",
        },
      }),
      ...(cursor && {
        id: {
          gt: cursor,
        },
      }),
    },
    orderBy: {
      id: "asc",
    },
    take: limit + 1, // Take one extra to check if there are more results
  });

  const hasNextPage = tags.length > limit;
  const results = hasNextPage ? tags.slice(0, limit) : tags;
  const nextCursor = hasNextPage ? results[results.length - 1]?.id : null;

  return NextResponse.json({
    tags: results,
    nextCursor,
    hasNextPage,
  });
});

export const POST = userRoute
  .body(TagSchema)
  .handler(async (req, { body, ctx }) => {
    const tag = await prisma.tag.create({
      data: {
        name: body.name,
        userId: ctx.user.id,
        type: "USER",
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    return NextResponse.json({
      success: true,
      tag,
    });
  });
