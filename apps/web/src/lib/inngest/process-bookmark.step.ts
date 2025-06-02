export const BOOKMARK_STEPS = [
  {
    id: "pending",
    name: "Pending",
    order: 0,
  },
  {
    id: "get-bookmark",
    name: "Retrieve bookmark",
    order: 1,
  },
  {
    id: "scrap-content",
    name: "Scrapping the content",
    order: 2,
  },
  {
    id: "extract-metadata",
    name: "Extract metadata",
    order: 3,
  },
  {
    id: "summary-page",
    name: "Summary the page",
    order: 4,
  },
  {
    id: "find-tags",
    name: "Find relevant tags",
    order: 5,
  },
  {
    id: "screenshot",
    name: "Taking screenshot",
    order: 6,
  },
  {
    id: "saving",
    name: "Saving",
    order: 7,
  },
  {
    id: "finish",
    name: "Finish",
    order: 8,
  },
  {
    id: "transcript-video",
    name: "Transcript video",
    order: 9,
  },
  {
    id: "describe-screenshot",
    name: "Describe screenshot",
    order: 10,
  },
  {
    id: "get-tweet",
    name: "Get tweet",
    order: 11,
  },
] as const;

export type BookmarkStepId = (typeof BOOKMARK_STEPS)[number]["id"];
export type BookmarkStep = (typeof BOOKMARK_STEPS)[number];

export const BOOKMARK_STEP_ID_TO_INDEX: Record<BookmarkStepId, number> =
  Object.fromEntries(
    BOOKMARK_STEPS.map((step, idx) => [step.id, idx]),
  ) as Record<BookmarkStepId, number>;

export const BOOKMARK_STEP_NAME_TO_ID: Record<string, BookmarkStepId> =
  Object.fromEntries(
    BOOKMARK_STEPS.map((step) => [step.name, step.id]),
  ) as Record<string, BookmarkStepId>;

export const BOOKMARK_STEP_ID_TO_ID: Record<BookmarkStepId, string> =
  Object.fromEntries(
    BOOKMARK_STEPS.map((step) => [step.id, step.id]),
  ) as Record<BookmarkStepId, string>;
