"use client";

import { SvglImg } from "@/components/svgl-auto-dark-mode-image";
import { authClient, useSession } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation } from "@tanstack/react-query";
import { ButtonProps } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { usePostHog } from "posthog-js/react";
import { toast } from "sonner";
import { LoadingButton } from "../form/loading-button";

type OAuthProvider = "github" | "google";

const IconMap: Record<OAuthProvider, { light: string; dark: string }> = {
  github: {
    light: "github_light",
    dark: "github_dark",
  },
  google: {
    light: "google",
    dark: "google",
  },
};

export const SignInWith = (props: {
  type: OAuthProvider;
  className?: string;
  buttonProps: ButtonProps;
}) => {
  const posthog = usePostHog();
  const session = useSession();
  const mutation = useMutation({
    mutationFn: () => {
      posthog.capture("sign_in_with_social", {
        provider: props.type,
      });
      return unwrapSafePromise(
        authClient.signIn.social({
          provider: props.type,
          callbackURL: "/app",
        }),
      );
    },
    onSuccess: () => {
      session.refetch();
      toast.success("Signed in with GitHub");
    },
    onError: (ctx: { error: { message: string } }) => {
      toast.error(ctx.error.message);
    },
  });

  return (
    <LoadingButton
      loading={mutation.isPending}
      className={cn("flex-1 max-lg:py-2 w-full", props.className)}
      variant="outline"
      onClick={() => {
        mutation.mutate();
      }}
      {...props.buttonProps}
    >
      <SvglImg
        height="16"
        width="16"
        lightIconName={IconMap[props.type].light}
        darkIconName={IconMap[props.type].dark}
      />

      {props.type === "github" ? "Continue with GitHub" : null}
      {props.type === "google" ? "Continue with Google" : null}
    </LoadingButton>
  );
};
