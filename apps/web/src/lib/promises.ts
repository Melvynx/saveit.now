/**
 * Safely executes a promise and returns a type-safe result object.
 *
 * @param promise - The promise to execute
 * @returns An object containing either the result or the error
 */
export async function safePromise<T>(promise: Promise<T>): Promise<{
  data: T | null;
  error: Error | null;
}> {
  try {
    const result = await promise;
    return {
      data: result,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Unwraps a result object from safePromise and either returns the result or throws the error.
 *
 * @param promise - The result object from safePromise
 * @returns The result value if no error occurred
 * @throws The error if one occurred
 */
export async function unwrapSafePromise<T, E = Error>(
  promise: Promise<{
    data: T | null;
    error: E;
  }>,
): Promise<T> {
  const { error, data } = await promise;
  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error("Data is null but no error was provided");
  }

  return data;
}
