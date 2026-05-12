import { Command } from "commander";
import { handleError } from "../error-handling.js";
import { getClient } from "../sdk-factory.js";
import { output } from "../output.js";

export const tagsCommand = new Command("tags").description(
  "List and inspect tags",
);

tagsCommand
  .command("list")
  .description("List all tags for the authenticated user")
  .option("--limit <n>", "Max results (1-100)", "20")
  .option("--cursor <cursor>", "Pagination cursor")
  .option("--fields <cols>", "Comma-separated columns to display")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .action(
    async (opts: {
      limit?: string;
      cursor?: string;
      fields?: string;
      json?: boolean;
      format?: string;
    }) => {
      try {
        const result = await getClient().tags.list({
          limit: opts.limit ? Number(opts.limit) : undefined,
          cursor: opts.cursor,
        });
        output(result.tags, {
          json: opts.json,
          format: opts.format,
          fields: opts.fields?.split(","),
        });
      } catch (err) {
        handleError(err, opts.json);
      }
    },
  );
