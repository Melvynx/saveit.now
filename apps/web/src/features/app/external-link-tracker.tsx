"use client";

import { usePostHog } from "posthog-js/react";

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);

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
