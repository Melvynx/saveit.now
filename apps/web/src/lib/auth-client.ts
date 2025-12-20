import {
  adminClient,
  apiKeyClient,
  emailOTPClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getServerUrl } from "./server-url";

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), adminClient(), emailOTPClient(), apiKeyClient()],
  baseURL: getServerUrl(),
});

export const { signIn, signUp, useSession } = authClient;
