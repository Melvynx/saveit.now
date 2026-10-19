"use client";

import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { cn } from "@workspace/ui/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { motion } from "motion/react";

type Step = { label: string; orders: readonly number[] };

/**
 * `processingStep` values patched by the Convex workflow, grouped into the
 * order a user experiences them. The fetch step depends on the source.
 */
function getSteps(type: BookmarkDetailDTO["type"]): Step[] {
  const fetchStep: Step =
    type === "TWEET"
      ? { label: "Getting the tweet", orders: [11] }
      : type === "YOUTUBE"
        ? { label: "Reading the transcript", orders: [9] }
        : { label: "Reading the page", orders: [2] };

  return [
    { label: "Starting", orders: [0, 1] },
    fetchStep,
    { label: "Extracting details", orders: [3, 10] },
    { label: "Writing the summary", orders: [4] },
    { label: "Finding tags", orders: [5] },
    { label: "Taking a screenshot", orders: [6] },
    { label: "Saving", orders: [7, 8] },
  ];
}

const ANY_FETCH_ORDERS = [2, 9, 11];

function getActiveIndex(steps: Step[], current: number) {
  if (ANY_FETCH_ORDERS.includes(current)) return 1;
  const index = steps.findIndex((step) => step.orders.includes(current));
  return index === -1 ? 0 : index;
}

export function BookmarkProcessingSteps({
  bookmark,
}: {
  bookmark: BookmarkDetailDTO;
}) {
  const steps = getSteps(bookmark.type);
  const activeIndex = getActiveIndex(steps, bookmark.processingStep ?? 0);

  return (
    <section
      aria-live="polite"
      aria-label="Processing progress"
      className="rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/5"
    >
      <p className="text-[13px] font-medium text-foreground">
        Saving this bookmark
      </p>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Summary, tags and preview appear here as soon as they are ready.
      </p>
      <ol className="mt-4 flex flex-col gap-2">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <motion.li
              key={step.label}
              initial={false}
              animate={{ opacity: done || active ? 1 : 0.5 }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-center gap-2.5 text-[13px]"
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full",
                  done && "bg-primary text-primary-foreground",
                  active && "text-primary",
                  !done && !active && "ring-1 ring-border ring-inset",
                )}
              >
                {done ? (
                  <Check className="size-2.5" strokeWidth={3} />
                ) : active ? (
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                ) : null}
              </span>
              <span
                className={cn(
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
