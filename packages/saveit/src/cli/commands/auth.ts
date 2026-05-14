import { Command } from "commander";
import pc from "picocolors";
import { Saveit } from "../../sdk.js";
import { SaveitApiError } from "../../errors.js";
import {
  getToken,
  hasToken,
  maskToken,
  removeToken,
  setToken,
  tokenSource,
} from "../auth-store.js";
import { handleError } from "../error-handling.js";
import { output } from "../output.js";
import { TOKEN_PATH } from "../config.js";

export const authCommand = new Command("auth").description(
  "Manage your SaveIt API key",
);

authCommand
  .command("set")
  .description("Save an API key to ~/.config/tokens/saveit.txt")
  .argument("<token>", "API key generated at https://saveit.now/account/keys")
  .action((token: string) => {
    try {
      setToken(token);
      console.log(pc.green("✓"), `Saved token to ${TOKEN_PATH}`);
    } catch (err) {
      handleError(err);
    }
  });

authCommand
  .command("show")
  .description("Show the configured API key (masked by default)")
  .option("--raw", "Print the unmasked token (use with care - lands in shell history)")
  .action((opts: { raw?: boolean }) => {
    try {
      if (!hasToken()) {
        console.log(pc.dim("No token configured."));
        return;
      }
      const token = getToken();
      if (opts.raw) {
        console.error(
          pc.yellow(
            "⚠ Printing raw token. It will appear in shell history and scrollback.",
          ),
        );
        console.log(token);
      } else {
        const source = tokenSource();
        console.log(`${maskToken(token)}  ${pc.dim(`(from ${source})`)}`);
      }
    } catch (err) {
      handleError(err);
    }
  });

authCommand
  .command("remove")
  .description("Delete the saved API key")
  .action(() => {
    try {
      removeToken();
      console.log(pc.green("✓"), "Token removed.");
    } catch (err) {
      handleError(err);
    }
  });

authCommand
  .command("test")
  .description("Verify the API key works against /tags")
  .option("--json", "Output as JSON")
  .action(async (opts: { json?: boolean }) => {
    try {
      const saveit = new Saveit({
        apiKey: getToken(),
        baseUrl: process.env.SAVEIT_BASE_URL,
      });
      const result = await saveit.tags.list({ limit: 1 });
      output(
        {
          ok: true,
          tagCount: result.tags.length,
          hasMore: result.hasMore,
          source: tokenSource(),
          tokenPath: TOKEN_PATH,
        },
        { json: opts.json },
      );
    } catch (err) {
      if (err instanceof SaveitApiError && err.status === 401) {
        handleError(
          new SaveitApiError(401, "API key is invalid or expired.", {
            code: err.code,
            response: err.response,
          }),
          opts.json,
        );
      }
      handleError(err, opts.json);
    }
  });
