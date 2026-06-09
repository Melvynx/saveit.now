import { requireUser } from "@/lib/safe-route";
import { prisma } from "@workspace/database/client";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const tagSchema = z.object({
  name: z.string(),
});

export const Route = createFileRoute("/api/tags")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q");
        const cursor = searchParams.get("cursor");
        const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

        const tags = await prisma.tag.findMany({
          where: {
            userId: user.id,
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
          orderBy: { id: "asc" },
          take: limit + 1,
        });

        const hasNextPage = tags.length > limit;
        const results = hasNextPage ? tags.slice(0, limit) : tags;
        const nextCursor = hasNextPage ? results[results.length - 1]?.id : null;

        return Response.json({
          tags: results,
          nextCursor,
          hasNextPage,
        });
      },
      POST: async ({ request }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const body = tagSchema.parse(await request.json());
        const tag = await prisma.tag.create({
          data: {
            name: body.name,
            userId: user.id,
            type: "USER",
          },
          select: {
            id: true,
            name: true,
            type: true,
          },
        });

        return Response.json({ success: true, tag });
      },
    },
  },
});
