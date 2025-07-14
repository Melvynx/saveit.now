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
