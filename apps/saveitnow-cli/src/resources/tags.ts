import { Command } from "commander";
import { client } from "../lib/client.js";
import { output } from "../lib/output.js";
import { handleError } from "../lib/errors.js";
import { log } from "../lib/logger.js";

interface ListOpts {
  json?: boolean;
  format?: string;
  fields?: string;
  limit?: string;
  cursor?: string;
}

export const tagsResource = new Command("tags")
  .description("Manage tags");

tagsResource
  .command("list")
  .description("List all tags")
  .option("--limit <n>", "Max results (1-100)", "20")
  .option("--cursor <id>", "Pagination cursor")
  .option("--fields <cols>", "Comma-separated columns to display")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", "\nExamples:\n  saveitnow tags list\n  saveitnow tags list --limit 50 --json")
  .action(async (opts: ListOpts) => {
    try {
      const params: Record<string, string> = {
        limit: opts.limit ?? "20",
      };
      if (opts.cursor) params.cursor = opts.cursor;

      const data = (await client.get("/tags", params)) as {
        tags: Record<string, unknown>[];
        hasMore: boolean;
        nextCursor: string | null;
      };

      const fields = opts.fields?.split(",");
      output(data.tags, { json: opts.json, format: opts.format, fields });

      if (data.hasMore && data.nextCursor && !opts.json) {
        log.info(`\nMore results available. Use --cursor "${data.nextCursor}" to fetch next page.`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });
