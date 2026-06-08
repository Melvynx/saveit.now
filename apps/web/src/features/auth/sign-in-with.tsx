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
  variant?: "default" | "monochrome";
  callbackURL?: string;
}) => {
  const posthog = usePostHog();
  const session = useSession();
  const isMonochrome = props.variant === "monochrome";
  const mutation = useMutation({
    mutationFn: () => {
      posthog.capture("sign_in_with_social", {
        provider: props.type,
      });
      return unwrapSafePromise(
        authClient.signIn.social({
          provider: props.type,
          callbackURL: props.callbackURL ?? "/app",
        }),
      );
    },
    onSuccess: () => {
      session.refetch();
      toast.success(
        `Signed in with ${props.type === "github" ? "GitHub" : "Google"}`,
      );
    },
    onError: (ctx: { error: { message: string } }) => {
      toast.error(ctx.error.message);
    },
  });

  return (
    <LoadingButton
      loading={mutation.isPending}
      className={cn(
        "flex-1 max-lg:py-2 w-full",
        isMonochrome &&
          "h-[44px] min-h-[44px] border border-neutral-800 bg-black text-white shadow-none hover:border-neutral-700 hover:bg-neutral-950 hover:text-white",
        props.className,
      )}
      variant="outline"
      onClick={() => {
        mutation.mutate();
      }}
      {...props.buttonProps}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center",
          isMonochrome && "[&_img]:brightness-0 [&_img]:invert",
        )}
      >
        <SvglImg
          height="16"
          width="16"
          lightIconName={IconMap[props.type].light}
          darkIconName={IconMap[props.type].dark}
        />
      </span>

      <span className={cn(isMonochrome && "text-white")}>
        {props.type === "github" ? "Sign in with GitHub" : null}
        {props.type === "google" ? "Sign in with Google" : null}
      </span>
    </LoadingButton>
  );
};
