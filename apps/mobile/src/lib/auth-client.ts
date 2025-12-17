import { expoClient } from "@better-auth/expo/client";
import { stripeClient } from "@better-auth/stripe/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { getServerUrl } from "./server-url";

export const authClient = createAuthClient({
  baseURL: getServerUrl(),
  plugins: [
    expoClient({
      scheme: "saveit",
      storagePrefix: "saveit",
      storage: SecureStore,
    }),
    emailOTPClient(),
    stripeClient({ subscription: true }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
