import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

/**
 * useQuery for Convex authQuery functions.
 *
 * Skips the subscription until the Convex client holds an auth token: the
 * Better Auth session resolves before the JWT exchange completes, and an
 * authQuery fired in that window throws UNAUTHORIZED into the error
 * boundary, crashing the page. Pass "skip" to add your own skip conditions.
 */
export function useAuthedQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Query["_args"] | "skip",
): Query["_returnType"] | undefined {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    query,
    (isAuthenticated ? args : "skip") as Query["_args"],
  );
}
