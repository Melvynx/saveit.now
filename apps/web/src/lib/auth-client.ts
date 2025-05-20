import { stripeClient } from "@better-auth/stripe/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), stripeClient({ subscription: true })],
});

export const { signIn, signUp, useSession } = createAuthClient();
