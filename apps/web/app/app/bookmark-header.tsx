import { useUserPlan } from "@/lib/auth/user-plan";
import { upfetch } from "@/lib/up-fetch";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
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
      <Button variant="outline">
        {bookmarksInfo.data?.bookmarksCount ?? 0}/{plan.limits.bookmarks ?? 10}
      </Button>
      <Button>Upgrade</Button>
    </div>
  );
};
