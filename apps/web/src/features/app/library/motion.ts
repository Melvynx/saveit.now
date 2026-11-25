import type { Transition } from "motion/react";

/**
 * Shared motion vocabulary for the library. Springs are critically damped
 * enough to never overshoot visibly, and stay interruptible.
 */
export const SPRING_LAYOUT: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 40,
  mass: 1,
};

export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 36,
  mass: 0.8,
};

export const FADE: Transition = { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] };

export const FADE_FAST: Transition = { duration: 0.12, ease: "easeOut" };

/** How long item positions keep springing after the set of items changed. */
export const LAYOUT_SETTLE_MS = 700;
