import { useCallback, useState } from "react";

export function useAsyncTask<TArgs extends unknown[], TResult>(
  task: (...args: TArgs) => Promise<TResult>,
  options?: {
    onSuccess?: (result: TResult, args: TArgs) => void;
    onError?: (error: unknown, args: TArgs) => void;
  },
) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TResult | null>(null);

  const run = useCallback(
    async (...args: TArgs) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await task(...args);
        setData(result);
        options?.onSuccess?.(result, args);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("An error occurred");
        setError(error);
        options?.onError?.(error, args);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [options, task],
  );

  return { run, isPending, error, data };
}
