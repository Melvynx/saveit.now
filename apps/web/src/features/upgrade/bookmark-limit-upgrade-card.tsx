import { APP_LINKS } from "@/lib/app-links";
import { useUserPlan } from "@/lib/auth/user-plan";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  ArrowRight,
  Infinity as InfinityIcon,
  LockKeyhole,
} from "lucide-react";

type BookmarkLimitUpgradeCardProps = {
  bookmarkCount: number | undefined;
};

export function BookmarkLimitUpgradeCard({
  bookmarkCount,
}: BookmarkLimitUpgradeCardProps) {
  const plan = useUserPlan();
  const bookmarkLimit = plan.limits.bookmarks;
  const hasReachedBookmarkLimit =
    !plan.isLoading &&
    plan.name === "free" &&
    typeof bookmarkCount === "number" &&
    typeof bookmarkLimit === "number" &&
    bookmarkCount >= bookmarkLimit;

  if (!hasReachedBookmarkLimit) return null;

  return (
    <Link
      to={APP_LINKS.upgrade}
      aria-label={`Free plan limit reached. ${bookmarkCount} of ${bookmarkLimit} bookmarks used. Upgrade to Pro.`}
      className="group block w-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.96] transition-transform"
    >
      <Card className="overflow-hidden rounded-3xl border-primary/35 bg-gradient-to-br from-primary/20 via-card to-card shadow-lg shadow-primary/10 group-hover:border-primary/60 group-hover:shadow-xl group-hover:shadow-primary/15">
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm sm:size-14">
              <LockKeyhole className="size-5 sm:size-6" aria-hidden="true" />
            </div>

            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary tabular-nums">
                Free plan · {bookmarkCount}/{bookmarkLimit}
              </p>
              <h2 className="max-w-2xl text-balance text-xl font-semibold text-foreground sm:text-2xl">
                You&apos;ve reached your bookmark limit
              </h2>
              <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
                Upgrade to Pro to keep saving links and unlock up to 50,000
                bookmarks.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <InfinityIcon
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Keep saving without interruptions
            </div>
            <span
              className={buttonVariants({
                size: "lg",
                className:
                  "pointer-events-none min-h-11 gap-2 rounded-xl px-5 shadow-sm",
              })}
            >
              Upgrade to Pro
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
