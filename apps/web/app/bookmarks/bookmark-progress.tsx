import type { Realtime } from "@inngest/realtime";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Loader } from "@workspace/ui/components/loader";
import { Typography } from "@workspace/ui/components/typography";
import { useEffect } from "react";

export default function BookmarkProgress({
  token,
}: {
  token: Realtime.Subscribe.Token;
}) {
  const { latestData, data } = useInngestSubscription({ token });
  const router = useQueryClient();

  useEffect(() => {
    if (latestData?.topic === "finish") {
      void router.invalidateQueries({ queryKey: ["bookmarks"] });
    }
  }, [latestData?.topic, router]);

  return (
    <div className="flex items-center gap-2">
      <Loader className="text-muted-foreground size-4" />
      <Typography variant="muted">
        {latestData?.data.data ?? "Processing..."}
      </Typography>
    </div>
  );
}
