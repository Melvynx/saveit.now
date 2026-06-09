"use client";

import { APP_LINKS } from "@/lib/app-links";
import { authClient } from "@/lib/auth-client";
import { Link, useLocation } from "@tanstack/react-router";
import {
  buttonVariants,
  type ButtonProps,
} from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

type LandingAppButtonProps = Pick<ButtonProps, "size" | "variant"> & {
  children?: ReactNode;
  className?: string;
};

export function LandingAppButton({
  children = "Open app",
  className,
  size = "sm",
  variant = "default",
}: LandingAppButtonProps) {
  const session = authClient.useSession();
  const location = useLocation();
  const currentUrl = `${location.pathname}${location.searchStr}`;
  const classNames = cn(buttonVariants({ size, variant }), className);

  if (session.data?.user) {
    return (
      <Link className={classNames} to={APP_LINKS.app}>
        {children}
      </Link>
    );
  }

  return (
    <Link
      className={classNames}
      mask={{ to: APP_LINKS.signin, unmaskOnReload: true }}
      resetScroll={false}
      search={(previous: Record<string, unknown>) => ({
        ...previous,
        from: currentUrl === "/" ? undefined : currentUrl,
        modal: "signin",
        redirectUrl: APP_LINKS.app,
      })}
      to="."
    >
      {children}
    </Link>
  );
}
