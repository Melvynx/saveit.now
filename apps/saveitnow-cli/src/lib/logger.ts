import pc from "picocolors";
import { globalFlags } from "./config.js";

/**
 * Logger that respects --json (silent except errors)
 * and --verbose (enables debug output).
 */
export const log = {
  /** Informational message. Suppressed in --json mode. */
  info(msg: string): void {
    if (!globalFlags.json) {
      console.log(msg);
    }
  },

  /** Success message with green checkmark. Suppressed in --json mode. */
  success(msg: string): void {
    if (!globalFlags.json) {
      console.log(`${pc.green("✓")} ${msg}`);
    }
  },

  /** Warning message. Suppressed in --json mode. */
  warn(msg: string): void {
    if (!globalFlags.json) {
      console.warn(`${pc.yellow("⚠")} ${msg}`);
    }
  },

  /** Error message. Always shown. */
  error(msg: string): void {
    console.error(`${pc.red("✗")} ${msg}`);
  },

  /** Debug message. Only shown with --verbose, suppressed in --json mode. */
  debug(msg: string): void {
    if (globalFlags.verbose && !globalFlags.json) {
      console.log(`${pc.dim("[debug]")} ${msg}`);
    }
  },
};
