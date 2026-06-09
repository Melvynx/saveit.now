import { authClient } from "@/lib/auth-client";
import { useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { ComponentPropsWithRef, useState } from "react";

export const LogoutButton = (props: ComponentPropsWithRef<"button">) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
              void router.navigate({ to: "/" });
              void router.invalidate();
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
