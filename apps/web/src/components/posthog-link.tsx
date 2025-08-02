"use client";

import { usePostHog } from "posthog-js/react";
import Link from "next/link";
import { ComponentProps } from "react";

interface PosthogLinkProps extends ComponentProps<typeof Link> {
  event?: string;
  properties?: Record<string, unknown>;
}

export function PosthogLink({ event, properties, onClick, ref, ...props }: PosthogLinkProps) {
  const posthog = usePostHog();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (event) {
      posthog.capture(event, properties);
    }
    onClick?.(e);
  };

  return <Link {...props} ref={ref} onClick={handleClick} />;
}