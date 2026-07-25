import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Platform } from "react-native";

import { authClient } from "../lib/auth-client";
import { mobileConfig } from "../lib/config";
import { hapticSelection } from "../lib/haptics";
import { getWebUrl } from "../lib/web-url";

export function useOpenUpgrade() {
  const router = useRouter();

  return useCallback(async () => {
    hapticSelection();

    if (Platform.OS === "ios") {
      router.push("/paywall");
      return;
    }

    const upgradeUrl = getWebUrl("/upgrade");

    try {
      const result = await authClient.oneTimeToken.generate();
      const token = result.data?.token;

      if (token) {
        const loginUrl = new URL("/auth/mobile-login", mobileConfig.apiUrl);
        loginUrl.searchParams.set("token", token);
        loginUrl.searchParams.set("redirect", "/upgrade");
        await WebBrowser.openBrowserAsync(loginUrl.toString());
        return;
      }
    } catch {
      // Fall back to the public upgrade page when token generation is unavailable.
    }

    await WebBrowser.openBrowserAsync(upgradeUrl);
  }, [router]);
}
