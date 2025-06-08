"use server";

import { getAuthLimits } from "@/lib/auth-limits";
import { ApplicationError } from "@/lib/errors";
import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const exportBookmarksAction = userAction
  .schema(z.object({}))
  .action(async ({ ctx: { user } }) => {
    const limits = await getAuthLimits();

    if (limits.canExport === 0) {
      throw new ApplicationError(
        "You have reached the maximum number of exports",
      );
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: user.id,
      },
      select: {
        title: true,
        ogDescription: true,
        summary: true,
        type: true,
        url: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert to CSV format
    const csvHeader = "title,description,summary,type,url\n";

    const csvRows = bookmarks
      .map(
        (bookmark: {
          title: string | null;
          ogDescription: string | null;
          summary: string | null;
          type: string | null;
          url: string;
        }) => {
          const title = escapeCsvField(bookmark.title || "");
          const description = escapeCsvField(bookmark.ogDescription || "");
          const summary = escapeCsvField(bookmark.summary || "");
          const type = escapeCsvField(bookmark.type || "");
          const url = escapeCsvField(bookmark.url);

          return `${title},${description},${summary},${type},${url}`;
        },
      )
      .join("\n");

    const csvContent = csvHeader + csvRows;

    return {
      csvContent,
      totalBookmarks: bookmarks.length,
    };
  });

// Helper function to escape CSV fields
function escapeCsvField(field: string): string {
  // If field contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
