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
    version: "1.6.0",
    date: "2025-08-02",
    type: "improvement",
    title: "iOS App",
    description: "Download the iOS application now !",
    changes: [
      {
        type: "new",
        text: "Download the iOS application now !",
      },
    ],
    image: "https://codelynx.mlvcdn.com/images/2025-08-02/saveit-ios.png",
  },
  {
    version: "1.5.0",
    date: "2025-07-25",
    type: "improvement",
    title: "Chrome Extension Screenshots",
    description:
      "New Chrome Extension now takes screenshots directly from the browser for better quality and compatibility.",
    changes: [
      {
        type: "improvement",
        text: "Chrome Extension now captures screenshots directly from the browser",
      },
      {
        type: "improvement",
        text: "Better screenshot quality and resolution for all websites",
      },
      {
        type: "fix",
        text: "Solved screenshot issues with e-commerce and protected websites",
      },
    ],
    image: "https://codelynx.mlvcdn.com/images/2025-07-25/dssdkasdl.gif",
  },
  {
    version: "1.4.0",
    date: "2025-07-23",
    type: "improvement",
    title: "Live on Product Hunt !",
    description: "Join the hype and try SaveIt.now on Product Hunt !",
    changes: [
      {
        type: "new",
        text: "Join the hype and try SaveIt.now on Product Hunt !",
      },
    ],
    image: "https://codelynx.mlvcdn.com/images/2025-07-25/ph.png",
  },
  {
    version: "1.3.1",
    date: "2025-07-19",
    type: "improvement",
    title: "Changelog Notifications",
    description:
      "Never miss an update! Get notified about new features and improvements with our new notification system.",
    changes: [
      {
        type: "new",
        text: "Add changelog notification to easily see the new features",
      },
    ],
    image: "https://codelynx.mlvcdn.com/images/2025-07-25/changelog.png",
  },
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
    image: "https://codelynx.mlvcdn.com/images/2025-07-25/add-screenshot.gif",
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
    image: "https://codelynx.mlvcdn.com/images/2025-07-25/api-key.gif",
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
    image: "https://codelynx.mlvcdn.com/images/2025-07-25/1.0.0.gif",
  },
];
