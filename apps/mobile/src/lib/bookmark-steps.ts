/**
 * Processing pipeline steps mirrored from the Convex backend
 * (packages/backend/convex/processing — `processingStep` patches).
 * `order` matches the numeric value stored on the bookmark document.
 */
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

export function getBookmarkStepName(processingStep: number | null | undefined) {
  return (
    BOOKMARK_STEPS.find((step) => step.order === processingStep)?.name ??
    BOOKMARK_STEPS[0].name
  );
}
