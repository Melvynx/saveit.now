import { query } from "./_generated/server";

/**
 * Sanity-check query used to verify the Convex wiring end to end.
 * Call it from a client with `useQuery(api.health.check, {})`.
 */
export const check = query({
  args: {},
  handler: async () => {
    return { ok: true, service: "saveit-backend" } as const;
  },
});
