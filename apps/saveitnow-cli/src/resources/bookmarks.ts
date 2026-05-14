import { Command } from "commander";
import { client } from "../lib/client.js";
import { output } from "../lib/output.js";
import { handleError, CliError } from "../lib/errors.js";
import { log } from "../lib/logger.js";

function validateId(id: string): string {
  if (!/^[\w-]+$/.test(id)) {
    throw new CliError(2, "Invalid bookmark ID");
  }
  return id;
}

interface ListOpts {
  json?: boolean;
  format?: string;
  fields?: string;
  limit?: string;
  cursor?: string;
  query?: string;
  tags?: string;
  types?: string;
  special?: string;
}

interface CreateOpts {
  json?: boolean;
  url: string;
}

interface DeleteOpts {
  json?: boolean;
}

interface RandomOpts {
  json?: boolean;
  format?: string;
}

export const bookmarksResource = new Command("bookmarks")
  .description("Manage bookmarks");

bookmarksResource
  .command("list")
  .description("List and search bookmarks")
  .option("--limit <n>", "Max results (1-100)", "20")
  .option("--cursor <id>", "Pagination cursor")
  .option("--query <q>", "Search query")
  .option("--tags <tags>", "Filter by tags (comma-separated)")
  .option("--types <types>", "Filter by type (comma-separated: LINK,VIDEO,PDF,NOTE)")
  .option("--special <filter>", "Special filter: READ, UNREAD, STAR")
  .option("--fields <cols>", "Comma-separated columns to display")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", "\nExamples:\n  saveitnow bookmarks list\n  saveitnow bookmarks list --query \"react\" --limit 5\n  saveitnow bookmarks list --tags \"dev,tools\" --json\n  saveitnow bookmarks list --special UNREAD")
  .action(async (opts: ListOpts) => {
    try {
      const params: Record<string, string> = {
        limit: opts.limit ?? "20",
      };
      if (opts.cursor) params.cursor = opts.cursor;
      if (opts.query) params.query = opts.query;
      if (opts.tags) params.tags = opts.tags;
      if (opts.types) params.types = opts.types;
      if (opts.special) params.special = opts.special;

      const data = (await client.get("/bookmarks", params)) as {
        bookmarks: Record<string, unknown>[];
        hasMore: boolean;
        nextCursor: string | null;
      };

      const fields = opts.fields?.split(",");
      output(data.bookmarks, { json: opts.json, format: opts.format, fields });

      if (data.hasMore && data.nextCursor && !opts.json) {
        log.info(`\nMore results available. Use --cursor "${data.nextCursor}" to fetch next page.`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

bookmarksResource
  .command("create")
  .description("Create a new bookmark")
  .requiredOption("--url <url>", "URL to bookmark")
  .option("--json", "Output as JSON")
  .addHelpText("after", '\nExamples:\n  saveitnow bookmarks create --url "https://example.com"\n  saveitnow bookmarks create --url "https://youtube.com/watch?v=abc" --json')
  .action(async (opts: CreateOpts) => {
    try {
      const data = await client.post("/bookmarks", { url: opts.url });
      output(data, { json: opts.json });
      if (!opts.json) {
        log.success("Bookmark created");
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

bookmarksResource
  .command("delete")
  .description("Delete a bookmark by ID")
  .argument("<id>", "Bookmark ID")
  .option("--json", "Output as JSON")
  .addHelpText("after", "\nExample:\n  saveitnow bookmarks delete abc123")
  .action(async (id: string, opts: DeleteOpts) => {
    try {
      await client.delete(`/bookmarks/${validateId(id)}`);
      output({ deleted: true, id }, { json: opts.json });
      if (!opts.json) {
        log.success("Bookmark deleted");
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

bookmarksResource
  .command("random")
  .description("Get a random unread bookmark")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", "\nExample:\n  saveitnow bookmarks random\n  saveitnow bookmarks random --json")
  .action(async (opts: RandomOpts) => {
    try {
      const data = (await client.get("/bookmarks/random")) as {
        bookmark: Record<string, unknown> | null;
        remaining: number;
      };
      if (!data.bookmark) {
        log.info("No unread bookmarks available");
        return;
      }
      output(data.bookmark, { json: opts.json, format: opts.format });
      if (!opts.json) {
        log.info(`${data.remaining} unread bookmarks remaining`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });
