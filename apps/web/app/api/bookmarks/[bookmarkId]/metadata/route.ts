import { SafeRouteError } from "@/lib/errors";
import { getFaviconUrl } from "@/lib/inngest/bookmark.utils";
import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import * as cheerio from "cheerio";
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

    const response = await fetch(bookmark.url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $("title").text();
    const faviconUrl = getFaviconUrl($, bookmark.url);

    return {
      title,
      faviconUrl,
    };
  });
