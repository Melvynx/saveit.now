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

    const realtimeEnabled =
      process.env.NODE_ENV === "production" &&
      !process.env.CI &&
      !!process.env.INNGEST_EVENT_KEY;

    if (!realtimeEnabled) {
      return { token: null };
    }

    const token = await getSubscriptionToken(inngest, {
      channel: `bookmark:${bookmark.id}`,
      topics: ["status", "finish"],
    });

    return { token };
  });
