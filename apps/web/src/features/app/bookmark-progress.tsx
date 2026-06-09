import { BOOKMARK_STEPS } from "@/lib/inngest/process-bookmark.step";
import type { Realtime } from "@inngest/realtime";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Loader } from "@workspace/ui/components/loader";
import { Text } from "@workspace/ui/components/text";
import { motion } from "motion/react";
import { useEffect } from "react";

export default function BookmarkProgress({
  token,
  bookmarkId,
}: {
  token?: Realtime.Subscribe.Token;
  bookmarkId: string;
}) {
  const { latestData } = useInngestSubscription({ token });
  const router = useQueryClient();

  const data = (latestData?.data ?? BOOKMARK_STEPS[0]) as {
    id: string;
    order: number;
  };
  const currentStep = BOOKMARK_STEPS.find((b) => b.id === data?.id);
  const currentStepIdx = data?.order ?? 0;

  useEffect(() => {
    if (latestData?.topic === "finish") {
      void router.invalidateQueries({ queryKey: ["bookmarks"] });
      void router.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
    }
  }, [bookmarkId, latestData?.topic, router]);

  return (
    <div className="flex flex-col items-start w-fit mx-auto justify-center gap-2">
      <div className="flex w-full items-center justify-center gap-2">
        {Array.from({ length: 9 }).map((_, idx) => {
          const isActive = idx === currentStepIdx;
          const isCompleted = idx < currentStepIdx;
          return (
            <motion.div
              key={idx}
              layout
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{
                scale: isActive ? 1.2 : 1,
                opacity: isActive ? 1 : isCompleted ? 0.8 : 0.4,
                backgroundColor:
                  isActive || isCompleted ? "var(--primary)" : "var(--accent)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="h-1 rounded-full"
              style={{
                height: 3,
                width: 10,
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 relative -left-0.5">
        <Loader className="text-muted-foreground size-4" />
        <Text variant="shine" key={currentStep?.name}>
          {currentStep?.name}
        </Text>
      </div>
    </div>
  );
}
