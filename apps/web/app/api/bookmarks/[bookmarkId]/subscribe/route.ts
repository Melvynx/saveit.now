import { SafeRouteError } from "@/lib/errors";
import { inngest } from "@/lib/inngest/client";
import { userRoute } from "@/lib/safe-route";
import { getSubscriptionToken } from "@inngest/realtime";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const GET = userRoute
  .params(
    z.object({
      bookmarkId: z.string(),
    }),
  )
  .handler(async (req, { params }) => {
    const { bookmarkId } = params;

    const bookmark = await prisma.bookmark.findUnique({
      where: {
        id: bookmarkId,
      },
    });

    if (!bookmark?.id) {
      throw new SafeRouteError("Invalid");
    }

    const token = await getSubscriptionToken(inngest, {
      channel: `bookmark:${bookmark.id}`,
      topics: ["status", "finish"],
    });

    return { token };
  });
