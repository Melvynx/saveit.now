import { useAuthedQuery } from "@/hooks/use-authed-query";
import { APP_LINKS } from "@/lib/app-links";
import { useUserPlan } from "@/lib/auth/user-plan";
import { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { cn } from "@workspace/ui/lib/utils";

/** Free-plan usage line: "12 / 20 bookmarks" with a 2px progress bar. */
export function SidebarUsage() {
  const plan = useUserPlan();
  const count = useAuthedQuery(api.bookmarks.queries.count, {});
  const limit = plan.limits.bookmarks;

  if (plan.isLoading || plan.name === "pro" || count === undefined) return null;
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const ratio = Math.min(1, count / limit);
  const nearLimit = ratio >= 0.8;

  return (
    <Link
      to={APP_LINKS.upgrade}
      className="group block rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent"
    >
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground tabular-nums">
          {count} / {limit} bookmarks
        </span>
        <span className="font-medium text-primary opacity-80 group-hover:opacity-100">
          Upgrade
        </span>
      </div>
      <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-foreground/8">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            nearLimit ? "bg-primary" : "bg-foreground/35",
          )}
          style={{ width: `${Math.max(ratio * 100, 2)}%` }}
        />
      </div>
    </Link>
  );
}
