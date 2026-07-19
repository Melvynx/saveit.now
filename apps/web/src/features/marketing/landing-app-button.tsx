"use client";

import { APP_LINKS } from "@/lib/app-links";
import { authClient } from "@/lib/auth-client";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  buttonVariants,
  type ButtonProps,
} from "@workspace/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const APP_NAME = "SaveIt.now";
const ALWAYS_OPEN_APP_STORAGE_KEY = "saveit-now-landing-always-open-app";
const PROMPT_DISMISSED_STORAGE_KEY = "saveit-now-landing-open-app-dismissed-at";
const PROMPT_DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

type LandingAppButtonProps = Pick<ButtonProps, "size" | "variant"> & {
  authIntent?: "signin" | "signup";
  children?: ReactNode;
  className?: string;
  showAlwaysOpenPrompt?: boolean;
  signedOutChildren?: ReactNode;
};

export function LandingAppButton({
  authIntent = "signup",
  children = `Open ${APP_NAME}`,
  className,
  showAlwaysOpenPrompt = false,
  size = "sm",
  signedOutChildren,
  variant = "default",
}: LandingAppButtonProps) {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const classNames = cn(buttonVariants({ size, variant }), className);
  const isSignedIn = Boolean(session.data?.user);

  useEffect(() => {
    if (session.isPending || !isSignedIn) return;

    if (window.localStorage.getItem(ALWAYS_OPEN_APP_STORAGE_KEY) === "true") {
      void navigate({ to: APP_LINKS.app, replace: true });
      return;
    }

    if (!showAlwaysOpenPrompt) return;

    const dismissedAt = Number(
      window.localStorage.getItem(PROMPT_DISMISSED_STORAGE_KEY),
    );
    const isRecentlyDismissed =
      Number.isFinite(dismissedAt) &&
      Date.now() - dismissedAt < PROMPT_DISMISS_DURATION_MS;

    setShowPrompt(!isRecentlyDismissed);
  }, [isSignedIn, navigate, session.isPending, showAlwaysOpenPrompt]);

  const dismissPrompt = () => {
    window.localStorage.setItem(
      PROMPT_DISMISSED_STORAGE_KEY,
      String(Date.now()),
    );
    setShowPrompt(false);
  };

  const alwaysOpenApp = () => {
    window.localStorage.setItem(ALWAYS_OPEN_APP_STORAGE_KEY, "true");
    setShowPrompt(false);
    void navigate({ to: APP_LINKS.app });
  };

  if (isSignedIn) {
    return (
      <div className="relative">
        <Link className={classNames} to={APP_LINKS.app}>
          {children}
        </Link>
        {showAlwaysOpenPrompt && showPrompt ? (
          <Card className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-2rem))] rounded-lg border-border bg-popover py-3 text-popover-foreground shadow-lg">
            <CardHeader className="grid-cols-[1fr_auto] gap-2 px-3">
              <div>
                <CardTitle className="text-sm">
                  Skip the landing page next time?
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Go straight to your workspace whenever you visit {APP_NAME}.
                </CardDescription>
              </div>
              <CardAction>
                <Button
                  aria-label="Dismiss prompt"
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                  onClick={dismissPrompt}
                >
                  <X className="size-3.5" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-3 pt-2">
              <Button
                className="h-auto w-fit justify-start p-0 text-xs"
                size="sm"
                type="button"
                variant="link"
                onClick={alwaysOpenApp}
              >
                Always open {APP_NAME}
                <ArrowRight className="size-3.5" data-icon="inline-end" />
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  const signInHref = `/signin?intent=${authIntent}&step=email`;

  return (
    <a
      className={classNames}
      href={signInHref}
    >
      {signedOutChildren ?? children}
    </a>
  );
}
