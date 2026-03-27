import { getUserBookmarksByIds } from "@/lib/database/get-bookmark";
import { tool } from "ai";
import { z } from "zod";

const formatEnum = z.enum(["csv", "json"]);

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export const createDownloadBookmarksTool = (userId: string) =>
  tool({
    description: `Generate a downloadable file (CSV or JSON) containing specific bookmarks. The user will see a download button they can click. Use this after searching when the user asks to export, download, or save their bookmarks to a file.`,
    inputSchema: z.object({
      bookmarkIds: z
        .array(z.string())
        .describe("Array of bookmark IDs to include in the download"),
      filename: z
        .string()
        .optional()
        .describe(
          "Custom filename without extension (e.g. 'react-tutorials'). Defaults to 'bookmarks'",
        ),
      format: formatEnum
        .optional()
        .default("csv")
        .describe("File format: csv or json"),
    }),
    execute: async ({
      bookmarkIds,
      filename,
      format,
    }: {
      bookmarkIds: string[];
      filename?: string;
      format: z.infer<typeof formatEnum>;
    }) => {
      if (bookmarkIds.length === 0) {
        return { error: "No bookmark IDs provided" };
      }

      const bookmarks = await getUserBookmarksByIds(bookmarkIds, userId);

      if (bookmarks.length === 0) {
        return { error: "No bookmarks found" };
      }

      const baseName =
        filename || `bookmarks-${new Date().toISOString().split("T")[0]}`;

      const mapped = bookmarks.map((b) => ({
        title: b.title || "",
        url: b.url,
        type: b.type || "",
        summary: b.summary || "",
        description: b.ogDescription || "",
        tags: b.tags.map((t) => t.tag.name).join(", "),
        starred: b.starred,
        createdAt: b.createdAt.toISOString(),
      }));

      let content: string;
      let ext: string;
      let mimeType: string;

      if (format === "json") {
        content = JSON.stringify(mapped, null, 2);
        ext = "json";
        mimeType = "application/json";
      } else {
        const header = "title,url,type,summary,description,tags,starred,createdAt\n";
        const rows = mapped
          .map(
            (row) =>
              [
                escapeCsvField(row.title),
                escapeCsvField(row.url),
                escapeCsvField(row.type),
                escapeCsvField(row.summary),
                escapeCsvField(row.description),
                escapeCsvField(row.tags),
                row.starred ? "true" : "false",
                row.createdAt,
              ].join(","),
          )
          .join("\n");
        content = header + rows;
        ext = "csv";
        mimeType = "text/csv";
      }

      return {
        content,
        filename: `${baseName}.${ext}`,
        mimeType,
        format: ext,
        bookmarkCount: bookmarks.length,
      };
    },
  });
