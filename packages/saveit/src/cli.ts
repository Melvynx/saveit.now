#!/usr/bin/env node
import { Command } from "commander";
import { authCommand } from "./cli/commands/auth.js";
import { bookmarksCommand } from "./cli/commands/bookmarks.js";
import { tagsCommand } from "./cli/commands/tags.js";
import { globalFlags } from "./cli/config.js";
import { handleError } from "./cli/error-handling.js";

const program = new Command();

program
  .name("saveit")
  .description(
    "Official CLI for the SaveIt.now API (https://saveit.now/docs/cli)",
  )
  .version("0.1.0")
  .option("--json", "Output as JSON", false)
  .option("--format <fmt>", "Output format: text, json, csv, yaml", "text")
  .option("--verbose", "Enable debug logging", false)
  .option("--no-color", "Disable colored output")
  .option("--no-header", "Omit table/csv headers (for piping)")
  .hook("preAction", (_thisCmd, actionCmd) => {
    const root = actionCmd.optsWithGlobals();
    globalFlags.json = root.json ?? false;
    globalFlags.format = root.format ?? "text";
    globalFlags.verbose = root.verbose ?? false;
    globalFlags.noColor = root.color === false;
    globalFlags.noHeader = root.header === false;
  });

program.addCommand(authCommand);
program.addCommand(bookmarksCommand);
program.addCommand(tagsCommand);

program.parseAsync().catch((err) => {
  handleError(err);
});
