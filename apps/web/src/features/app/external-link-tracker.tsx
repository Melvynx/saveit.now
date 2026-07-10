"use client";

import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";

interface ExternalLinkTrackerProps {
  url: string;
  surface: "bookmark_card" | "bookmark_detail";
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const ExternalLinkTracker = ({
  url,
  surface,
  children,
  onClick,
  className,
}: ExternalLinkTrackerProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);

    trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_OPENED, {
      surface,
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
