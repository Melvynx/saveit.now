import {
  AdminEmptyState,
  AdminRelativeTime,
} from "@/features/admin/admin-shared";
import type { AdminActivityEvent } from "@/features/admin/types";
import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  Activity,
  Bookmark,
  CreditCard,
  MessageSquare,
  MousePointerClick,
  ThumbsUp,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const EVENT_STYLES: Record<
  AdminActivityEvent["type"],
  { icon: LucideIcon; label: string; tone: string }
> = {
  signup: {
    icon: UserPlus,
    label: "Signed up",
    tone: "bg-chart-2/15 text-chart-2",
  },
  subscription: {
    icon: CreditCard,
    label: "Subscribed",
    tone: "bg-primary/10 text-primary",
  },
  bookmark: {
    icon: Bookmark,
    label: "Saved a bookmark",
    tone: "bg-chart-3/15 text-chart-3",
  },
  feedback: {
    icon: ThumbsUp,
    label: "Chat feedback",
    tone: "bg-chart-4/15 text-chart-4",
  },
  open: {
    icon: MousePointerClick,
    label: "Opened a bookmark",
    tone: "bg-chart-5/15 text-chart-5",
  },
  conversation: {
    icon: MessageSquare,
    label: "Chat conversation",
    tone: "bg-muted text-muted-foreground",
  },
};

/**
 * Shared timeline for both the dashboard ("what is happening right now") and
 * the user detail page ("what did this account do"). `showUser` is off on the
 * detail page because every row belongs to the same person there.
 */
export function AdminActivityFeed({
  events,
  showUser = true,
  emptyTitle = "No activity yet",
  emptyDescription,
  className,
}: {
  events: AdminActivityEvent[];
  showUser?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  if (events.length === 0) {
    return (
      <AdminEmptyState
        icon={Activity}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ol className={cn("relative space-y-0", className)}>
      {events.map((event, index) => {
        const style = EVENT_STYLES[event.type];
        const Icon = style.icon;
        const isLast = index === events.length - 1;

        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className="bg-border absolute left-[15px] top-8 bottom-0 w-px"
              />
            ) : null}
            <span
              className={cn(
                "z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                style.tone,
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium">
                  {event.title}
                </p>
                <AdminRelativeTime
                  timestamp={event.at}
                  className="text-muted-foreground shrink-0 text-xs"
                />
              </div>
              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span>{style.label}</span>
                {showUser && event.userId ? (
                  <>
                    <span aria-hidden>·</span>
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: event.userId }}
                      preload="intent"
                      className="hover:text-foreground truncate underline-offset-2 hover:underline"
                    >
                      {event.userName ?? event.userId}
                    </Link>
                  </>
                ) : null}
                {event.meta ? (
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] font-normal"
                  >
                    {event.meta}
                  </Badge>
                ) : null}
              </div>
              {event.subtitle ? (
                <p className="text-muted-foreground/80 mt-0.5 truncate text-xs">
                  {event.subtitle}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
