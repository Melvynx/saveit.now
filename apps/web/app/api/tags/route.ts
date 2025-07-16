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

  const tags = await prisma.tag.findMany({
    where: {
      userId: ctx.user.id,
      ...(query && {
        name: {
          contains: query,
          mode: "insensitive",
        },
      }),
    },
    orderBy: {
      name: "asc",
    },
    take: 10, // Limit results for performance
  });

  return NextResponse.json(tags);
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
