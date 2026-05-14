import { Command } from "commander";
import { handleError } from "../error-handling.js";
import { getClient } from "../sdk-factory.js";
import { isJsonOutput, output } from "../output.js";
import type {
  BookmarkType,
  ListBookmarksOptions,
  SpecialFilter,
} from "../../types.js";

const BOOKMARK_TYPES: BookmarkType[] = [
  "VIDEO",
  "ARTICLE",
  "PAGE",
  "IMAGE",
  "YOUTUBE",
  "TWEET",
  "PDF",
  "PRODUCT",
];

const SPECIAL_FILTERS: SpecialFilter[] = ["READ", "UNREAD", "STAR"];

function parseTypes(value?: string): BookmarkType[] | undefined {
  if (!value) return undefined;
  return value
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is BookmarkType =>
      BOOKMARK_TYPES.includes(s as BookmarkType),
    );
}

function parseSpecial(value?: string): SpecialFilter | undefined {
  if (!value) return undefined;
  const upper = value.trim().toUpperCase();
  return SPECIAL_FILTERS.includes(upper as SpecialFilter)
    ? (upper as SpecialFilter)
    : undefined;
}

export const bookmarksCommand = new Command("bookmarks").description(
  "List, create, delete, or pick random bookmarks",
);

bookmarksCommand
  .command("list")
  .description("List and search bookmarks")
  .option("--query <query>", "Full-text search query")
  .option("--tags <tags>", "Comma-separated tag filter")
  .option(
    "--types <types>",
    `Comma-separated types: ${BOOKMARK_TYPES.join(", ")}`,
  )
  .option("--special <special>", `One of: ${SPECIAL_FILTERS.join(", ")}`)
  .option("--limit <n>", "Max results (1-100)", "20")
  .option("--cursor <cursor>", "Pagination cursor")
  .option("--fields <cols>", "Comma-separated columns to display")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText(
    "after",
    `\nExamples:\n  saveit bookmarks list\n  saveit bookmarks list --query "next.js" --json\n  saveit bookmarks list --tags design,ux --limit 5\n  saveit bookmarks list --types ARTICLE,VIDEO\n  saveit bookmarks list --special UNREAD --limit 10`,
  )
  .action(
    async (opts: {
      query?: string;
      tags?: string;
      types?: string;
      special?: string;
      limit?: string;
      cursor?: string;
      fields?: string;
      json?: boolean;
      format?: string;
    }) => {
      const wantsJson = isJsonOutput({ json: opts.json, format: opts.format });
      try {
        const params: ListBookmarksOptions = {
          query: opts.query,
          tags: opts.tags
            ? opts.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
          types: parseTypes(opts.types),
          special: parseSpecial(opts.special),
          limit: opts.limit ? Number(opts.limit) : undefined,
          cursor: opts.cursor,
        };
        const result = await getClient().bookmarks.list(params);
        output(wantsJson ? result : result.bookmarks, {
          json: opts.json,
          format: opts.format,
          fields: opts.fields?.split(","),
        });
      } catch (err) {
        handleError(err, wantsJson);
      }
    },
  );

bookmarksCommand
  .command("create")
  .description("Create a new bookmark")
  .requiredOption("--url <url>", "URL to save (required)")
  .option("--transcript <text>", "Optional transcript text")
  .option("--metadata <json>", "Optional JSON metadata")
  .option("--json", "Output as JSON")
  .action(
    async (opts: {
      url: string;
      transcript?: string;
      metadata?: string;
      json?: boolean;
    }) => {
      const wantsJson = isJsonOutput({ json: opts.json });
      try {
        const metadata = opts.metadata ? safeJson(opts.metadata) : undefined;
        const bookmark = await getClient().bookmarks.create({
          url: opts.url,
          transcript: opts.transcript,
          metadata,
        });
        output(bookmark, { json: opts.json });
      } catch (err) {
        handleError(err, wantsJson);
      }
    },
  );

bookmarksCommand
  .command("delete")
  .description("Delete a bookmark")
  .argument("<id>", "Bookmark ID")
  .option("--json", "Output as JSON")
  .action(async (id: string, opts: { json?: boolean }) => {
    const wantsJson = isJsonOutput({ json: opts.json });
    try {
      const result = await getClient().bookmarks.delete(id);
      output({ deleted: true, id: result.id }, { json: opts.json });
    } catch (err) {
      handleError(err, wantsJson);
    }
  });

bookmarksCommand
  .command("random")
  .description("Pick a random unopened bookmark and mark it as opened")
  .option("--json", "Output as JSON")
  .action(async (opts: { json?: boolean }) => {
    const wantsJson = isJsonOutput({ json: opts.json });
    try {
      const result = await getClient().bookmarks.random();
      if (wantsJson) {
        output(result, { json: true });
        return;
      }
      if (result.exhausted || !result.bookmark) {
        console.log("No more unopened bookmarks. You're all caught up.");
        return;
      }
      output(result.bookmark);
      console.log(`\n(${result.remaining} left to explore)`);
    } catch (err) {
      handleError(err, wantsJson);
    }
  });

function safeJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error("metadata must be a JSON object");
  } catch (err) {
    throw new Error(
      `Invalid --metadata JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
