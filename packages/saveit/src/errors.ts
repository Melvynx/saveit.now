/** Base class for any error thrown by the SaveIt SDK or CLI. */
export class SaveitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveitError";
  }
}

/** Thrown when the SaveIt API returns a non-2xx response. */
export class SaveitApiError extends SaveitError {
  readonly status: number;
  readonly code?: string;
  readonly response?: unknown;

  constructor(
    status: number,
    message: string,
    opts: { code?: string; response?: unknown } = {},
  ) {
    super(message);
    this.name = "SaveitApiError";
    this.status = status;
    this.code = opts.code;
    this.response = opts.response;
  }
}

/** Thrown when the SDK is misconfigured (missing API key, etc). */
export class SaveitConfigError extends SaveitError {
  constructor(message: string) {
    super(message);
    this.name = "SaveitConfigError";
  }
}
