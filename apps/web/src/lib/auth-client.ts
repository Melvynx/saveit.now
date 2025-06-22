import { stripeClient } from "@better-auth/stripe/client";
import {
  adminClient,
  emailOTPClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    stripeClient({ subscription: true }),
    adminClient(),
    emailOTPClient(),
  ],
});

export const { signIn, signUp, useSession } = authClient;
