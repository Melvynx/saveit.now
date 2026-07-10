import {
  type AnalyticsEvent,
  type AnalyticsProperties,
  trackAnalyticsEvent,
} from "@/lib/analytics";
import type { ComponentProps } from "react";

interface AnalyticsLinkProps extends ComponentProps<"a"> {
  event?: AnalyticsEvent;
  properties?: AnalyticsProperties;
}

export function AnalyticsLink({
  event,
  properties,
  onClick,
  ref,
  ...props
}: AnalyticsLinkProps) {
  const handleClick = (clickEvent: React.MouseEvent<HTMLAnchorElement>) => {
    if (event) {
      trackAnalyticsEvent(event, properties);
    }
    onClick?.(clickEvent);
  };

  return <a {...props} ref={ref} onClick={handleClick} />;
}
