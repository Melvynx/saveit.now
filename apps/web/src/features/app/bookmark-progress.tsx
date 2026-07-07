import { Loader } from "@workspace/ui/components/loader";
import { Text } from "@workspace/ui/components/text";
import { motion } from "motion/react";

// Processing steps matching the Convex pipeline
const BOOKMARK_STEPS: Array<{ id: string; order: number; name: string }> = [
  { id: "pending", order: 0, name: "Pending..." },
  { id: "get-bookmark", order: 1, name: "Getting bookmark..." },
  { id: "scrap-content", order: 2, name: "Scraping content..." },
  { id: "extract-metadata", order: 3, name: "Extracting metadata..." },
  { id: "summary", order: 4, name: "Generating summary..." },
  { id: "find-tags", order: 5, name: "Finding tags..." },
  { id: "screenshot", order: 6, name: "Taking screenshot..." },
  { id: "saving", order: 7, name: "Saving..." },
  { id: "finish", order: 8, name: "Done!" },
  { id: "transcript", order: 9, name: "Processing transcript..." },
  { id: "describe-screenshot", order: 10, name: "Describing screenshot..." },
  { id: "get-tweet", order: 11, name: "Getting tweet..." },
];

const TOTAL_VISIBLE_STEPS = 9;

export default function BookmarkProgress({
  processingStep,
}: {
  bookmarkId: string;
  processingStep?: number | null;
}) {
  const currentStepIdx = processingStep ?? 0;
  const currentStep = BOOKMARK_STEPS.find((b) => b.order === currentStepIdx);

  return (
    <div className="flex flex-col items-start w-fit mx-auto justify-center gap-2">
      <div className="flex w-full items-center justify-center gap-2">
        {Array.from({ length: TOTAL_VISIBLE_STEPS }).map((_, idx) => {
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
