import { stripeClient } from "@better-auth/stripe/client";
import { emailOTPClient, magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    stripeClient({ subscription: true }),
    emailOTPClient(),
  ],
});

export const { signIn, signUp, useSession } = createAuthClient();
