"use client";

import { useAction } from "next-safe-action/hooks";
import { usePostHog } from "posthog-js/react";
import { trackBookmarkOpenAction } from "./bookmark-page/track-bookmark-open.action";

interface ExternalLinkTrackerProps {
  bookmarkId: string;
  url: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const ExternalLinkTracker = ({
  bookmarkId,
  url,
  children,
  onClick,
  className,
}: ExternalLinkTrackerProps) => {
  const posthog = usePostHog();
  const trackAction = useAction(trackBookmarkOpenAction);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);

    // Track the open
    trackAction.execute({ bookmarkId });
    
    // Track with PostHog
    posthog.capture("bookmark+external_open", {
      bookmark_id: bookmarkId,
      url,
    });

    // Open in new tab
    window.open(url, "_blank");
  };

  return (
    <div onClick={handleClick} className={className}>
      {children}
    </div>
  );
};