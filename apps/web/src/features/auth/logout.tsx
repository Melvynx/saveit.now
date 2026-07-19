import { authClient } from "@/lib/auth-client";
import { replaceLocation } from "@/lib/browser-navigation";
import { LogOut } from "lucide-react";
import { ComponentPropsWithRef, useState } from "react";

export const LogoutButton = (props: ComponentPropsWithRef<"button">) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      {...props}
      onClick={() => {
        authClient.signOut(
          {},
          {
            onRequest: () => {
              setIsLoading(true);
            },
            onSuccess: () => {
              setIsLoading(false);
              // A document-level transition clears authenticated Convex
              // subscriptions before they can re-run without a token.
              replaceLocation("/");
            },
            onError: () => {
              setIsLoading(false);
            },
          },
        );
      }}
    >
      <LogOut className="size-4" />
      {isLoading ? "Loading..." : "Logout"}
    </button>
  );
};
