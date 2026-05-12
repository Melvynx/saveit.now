import pc from "picocolors";
import { SaveitApiError, SaveitError } from "../errors.js";
import { globalFlags } from "./config.js";

export function handleError(err: unknown, asJson?: boolean): never {
  const wantsJson = asJson ?? globalFlags.json;

  if (err instanceof SaveitApiError) {
    const payload = {
      ok: false,
      error: { status: err.status, code: err.code, message: err.message },
    };
    if (wantsJson) console.log(JSON.stringify(payload));
    else console.error(pc.red(`Error ${err.status}:`), err.message);
    process.exit(1);
  }

  if (err instanceof SaveitError) {
    if (wantsJson) {
      console.log(JSON.stringify({ ok: false, error: { message: err.message } }));
    } else {
      console.error(pc.red("Error:"), err.message);
    }
    process.exit(1);
  }

  const message = err instanceof Error ? err.message : String(err);
  if (wantsJson) {
    console.log(JSON.stringify({ ok: false, error: { message } }));
  } else {
    console.error(pc.red("Unexpected error:"), message);
    if (globalFlags.verbose && err instanceof Error && err.stack) {
      console.error(pc.dim(err.stack));
    }
  }
  process.exit(1);
}
