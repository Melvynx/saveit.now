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
    version: "1.2.0",
    date: "2025-07-18",
    type: "improvement",
    title: "Easy Screenshot Updates",
    description:
      "You can now easily update the screenshot of any bookmark with a single click.",
    changes: [
      {
        type: "improvement",
        text: "Update bookmark screenshots effortlessly",
      },
    ],
    image: "/changelog/add-screenshot.gif",
  },
  {
    version: "1.1.0",
    date: "2025-07-18",
    type: "feature",
    title: "API Keys & Developer API",
    description:
      "Manage your bookmarks programmatically with our new API. Create, list, and search bookmarks using API keys.",
    changes: [
      {
        type: "new",
        text: "API key management - create, view, and delete API keys",
      },
      {
        type: "new",
        text: "REST API endpoints for bookmarks (create, list, search)",
      },
      {
        type: "new",
        text: "Comprehensive API documentation with examples",
      },
      {
        type: "new",
        text: "Bearer token authentication for secure API access",
      },
      {
        type: "improvement",
        text: "Enhanced developer experience with code samples",
      },
    ],
    image: "/changelog/api-key.gif",
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
