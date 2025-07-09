import { stripeClient } from "@better-auth/stripe/client";
import {
  adminClient,
  emailOTPClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getServerUrl } from "./server-url";

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    stripeClient({ subscription: true }),
    adminClient(),
    emailOTPClient(),
  ],
  baseURL: getServerUrl(),
});

export const { signIn, signUp, useSession } = authClient;
