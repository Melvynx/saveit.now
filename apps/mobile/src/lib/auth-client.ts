import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient, oneTimeTokenClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { mobileConfig } from "./config";

export const authClient = createAuthClient({
  baseURL: mobileConfig.convexSiteUrl,
  plugins: [
    expoClient({
      scheme: "saveit",
      storagePrefix: "saveit",
      cookiePrefix: "save-it",
      storage: SecureStore,
    }),
    emailOTPClient(),
    oneTimeTokenClient(),
    convexClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
