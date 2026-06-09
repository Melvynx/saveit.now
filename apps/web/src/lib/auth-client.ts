import { apiKeyClient } from "@better-auth/api-key/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import {
  adminClient,
  emailOTPClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getServerUrl } from "./server-url";

export const authClient = createAuthClient({
  // App origin; /api/auth/* proxies to the Convex .site URL (auth-server.ts).
  baseURL: getServerUrl(),
  plugins: [
    magicLinkClient(),
    adminClient(),
    emailOTPClient(),
    apiKeyClient(),
    // convexClient() exchanges the BA session for a Convex token — REQUIRED, keep last.
    convexClient(),
  ],
});

export type AuthClientType = typeof authClient;

export const { useSession, signOut, signIn } = authClient;
