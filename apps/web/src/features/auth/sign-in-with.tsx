"use client";

import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingButton } from "../form/loading-button";
import { cn } from "@workspace/ui/lib/utils";

type OAuthProvider = "github" | "google";

const IconMap: Record<OAuthProvider, string> = {
  github: "github_dark.svg",
  google: "google.svg",
};

export const SignInWith = (props: {
  type: OAuthProvider;
  className?: string;
}) => {
  const mutation = useMutation({
    mutationFn: () => {
      return unwrapSafePromise(
        authClient.signIn.social({
          provider: props.type,
          callbackURL: "/app",
        }),
      );
    },
    onSuccess: () => {
      toast.success("Signed in with GitHub");
    },
    onError: (ctx: { error: { message: string } }) => {
      toast.error(ctx.error.message);
    },
  });

  return (
    <LoadingButton
      disabled={mutation.isPending}
      className={cn("flex-1", props.className)}
      variant="outline"
      onClick={() => {
        mutation.mutate();
      }}
    >
      <img
        height="16"
        width="16"
        src={`https://svgl.app/library/${IconMap[props.type]}`}
      />

      {props.type === "github" ? "Continue with GitHub" : null}
      {props.type === "google" ? "Continue with Google" : null}
    </LoadingButton>
  );
};
