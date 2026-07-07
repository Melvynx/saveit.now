import { ConvexError, type Value } from "convex/values";

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "LIMIT_REACHED"
  | "CONFIGURATION_ERROR";

type AppErrorMeta = Record<string, Value>;

type AppErrorData = {
  code: AppErrorCode;
  message: string;
  /** Optional machine-readable extras (e.g. which limit was hit). */
  meta?: AppErrorMeta;
};

export function throwAppError(
  code: AppErrorCode,
  message: string,
  meta?: AppErrorMeta,
): never {
  throw new ConvexError<AppErrorData>({
    code,
    message,
    ...(meta ? { meta } : {}),
  });
}

export function throwUnauthorized(message = "Unauthorized"): never {
  throwAppError("UNAUTHORIZED", message);
}

export function throwForbidden(message = "Forbidden"): never {
  throwAppError("FORBIDDEN", message);
}

export function throwNotFound(message = "Not found"): never {
  throwAppError("NOT_FOUND", message);
}

export function throwValidationError(message: string): never {
  throwAppError("VALIDATION_ERROR", message);
}

export function throwLimitReached(
  message: string,
  meta?: AppErrorMeta,
): never {
  throwAppError("LIMIT_REACHED", message, meta);
}

export function throwConfigurationError(message: string): never {
  throwAppError("CONFIGURATION_ERROR", message);
}
