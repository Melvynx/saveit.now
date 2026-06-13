import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    expoClient({
      scheme: "saveit",
      storagePrefix: "saveit",
      cookiePrefix: "save-it",
      storage: SecureStore,
    }),
    emailOTPClient(),
    convexClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
