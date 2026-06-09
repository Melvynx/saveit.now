import { query } from "../_generated/server";
import { authComponent, createAuth, getSocialProviders } from "./config";

/** Current auth user document (with custom fields) or null. Reactive. */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx);
  },
});

/** Full Better Auth session (used by SSR loaders + client guards). */
export const getSession = query({
  args: {},
  handler: async (ctx) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.getSession({ headers });
  },
});

export const getAvailableSocialProviders = query({
  args: {},
  handler: async () => {
    const providers = getSocialProviders();
    return Object.keys(providers ?? {});
  },
});

export const { getAuthUser } = authComponent.clientApi();
