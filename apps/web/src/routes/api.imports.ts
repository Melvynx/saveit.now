import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { URL_REGEX } from "@/features/imports/url-regex";

interface ImportResult {
  url: string;
  success: boolean;
  error?: string;
  bookmark?: unknown;
}

export const Route = createFileRoute("/api/imports")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ getUserLimits }, { createBookmark }, { requireUser }, { prisma }] =
          await Promise.all([
            import("@/lib/auth-session"),
            import("@/lib/database/create-bookmark"),
            import("@/lib/safe-route"),
            import("@workspace/database/client"),
          ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const { text } = z.object({ text: z.string() }).parse(await request.json());
        const urls = text.match(URL_REGEX) || [];
        const uniqueUrls = [...new Set(urls)];

        const userLimits = await getUserLimits();
        const currentBookmarkCount = await prisma.bookmark.count({
          where: { userId: user.id },
        });

        const availableSlots = userLimits.limits.bookmarks - currentBookmarkCount;

        if (availableSlots <= 0) {
          return Response.json(
            {
              error:
                "You have reached your bookmark limit. Please upgrade your plan or delete some bookmarks.",
            },
            { status: 400 },
          );
        }

        const urlsToProcess = uniqueUrls.slice(0, availableSlots);
        const skippedUrls = uniqueUrls.slice(availableSlots);
        const results: ImportResult[] = [];
        let successCount = 0;

        for (const url of urlsToProcess) {
          try {
            const bookmark = await createBookmark({
              url,
              userId: user.id,
            });

            results.push({
              url,
              success: true,
              bookmark,
            });
            successCount++;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error(`Failed to create bookmark for ${url}:`, error);

            results.push({
              url,
              success: false,
              error: errorMessage,
            });

            if (errorMessage.includes("maximum number of bookmarks")) {
              break;
            }
          }
        }

        return Response.json({
          totalUrls: uniqueUrls.length,
          processedUrls: urlsToProcess.length,
          skippedUrls: skippedUrls.length,
          createdBookmarks: successCount,
          failedBookmarks: results.filter((result) => !result.success).length,
          availableSlots,
          results,
          hasMoreUrls: skippedUrls.length > 0,
          limitReached: availableSlots < uniqueUrls.length,
        });
      },
    },
  },
});
