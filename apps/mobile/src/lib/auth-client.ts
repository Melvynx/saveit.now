import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { getServerUrl } from "./server-url";

export const authClient = createAuthClient({
  baseURL: getServerUrl(),
  storage: SecureStore,
  plugins: [
    expoClient({
      scheme: "saveit",
      storagePrefix: "saveit",
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
