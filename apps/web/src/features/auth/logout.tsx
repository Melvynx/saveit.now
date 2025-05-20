"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
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
              router.push("/");
              router.refresh();
            },
          },
        );
      }}
    >
      {isLoading ? "Loading..." : "Logout"}
    </button>
  );
};
