import { useUserPlan } from "@/lib/auth/user-plan";
import { upfetch } from "@/lib/up-fetch";
import { useQuery } from "@tanstack/react-query";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import Link from "next/link";
import { z } from "zod";

export type BookmarkHeaderProps = {};

export const BookmarkHeader = (props: BookmarkHeaderProps) => {
  const plan = useUserPlan();

  const bookmarksInfo = useQuery({
    queryKey: ["bookmarks", "info"],
    queryFn: () =>
      upfetch("/api/bookmarks/info", {
        schema: z.object({
          bookmarksCount: z.number(),
        }),
      }),
  });

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1"></div>
      <Button variant="outline" size="sm">
        {bookmarksInfo.data?.bookmarksCount ?? 0}/
        {plan.name === "pro" ? "∞" : (plan.limits.bookmarks ?? 10)}
      </Button>
      {plan.name === "free" && (
        <Link
          href="/upgrade"
          className={buttonVariants({ size: "sm", variant: "secondary" })}
        >
          Upgrade
        </Link>
      )}
    </div>
  );
};
