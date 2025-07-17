export interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "improvement" | "fix" | "major";
  title: string;
  description: string;
  changes: Array<{
    type: "new" | "improvement" | "fix" | "security";
    text: string;
  }>;
  image: string;
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "2025-07-16",
    type: "feature",
    title: "Custom Screenshot Upload & UX Improvements",
    description:
      "Upload custom screenshots for your bookmarks, improved tooltips, and cleaner console output.",
    changes: [
      {
        type: "new",
        text: "Upload custom screenshots for bookmarks with drag & drop or file picker (2MB limit, supports JPEG, PNG, WebP, GIF)",
      },
      {
        type: "improvement",
        text: "Enable tooltips for read button on bookmark cards showing 'Mark as read' or 'Mark as unread'",
      },
      {
        type: "improvement",
        text: "Remove debug console.log statements from bookmark operations and auth flows for cleaner console output",
      },
    ],
    image: "",
  },
  {
    version: "1.0.0",
    date: "2025-07-14",
    type: "feature",
    title: "Research with filters",
    description:
      "You can now filter your research by tags, categories, and more.",
    changes: [
      {
        type: "new",
        text: "You can now filter your research by tags, state and type",
      },
    ],
    image: "/changelog/1.0.0.gif",
  },
];
