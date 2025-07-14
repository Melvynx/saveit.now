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
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: "2.1.0",
    date: "2024-01-15",
    type: "feature",
    title: "AI-Powered Smart Search",
    description: "Enhanced search capabilities with artificial intelligence for better bookmark discovery.",
    changes: [
      { type: "new", text: "AI-powered semantic search for finding bookmarks by content meaning" },
      { type: "new", text: "Smart tag suggestions based on bookmark content" },
      { type: "improvement", text: "Faster search results with improved indexing" },
      { type: "fix", text: "Fixed search results not showing for special characters" },
    ]
  },
  {
    version: "2.0.5",
    date: "2024-01-10", 
    type: "improvement",
    title: "Performance & Bug Fixes",
    description: "Various performance improvements and bug fixes for a smoother experience.",
    changes: [
      { type: "improvement", text: "Reduced page load times by 40%" },
      { type: "improvement", text: "Improved bookmark import speed" },
      { type: "fix", text: "Fixed duplicate bookmarks appearing in some cases" },
      { type: "fix", text: "Resolved issue with bookmark screenshots not loading" },
    ]
  },
  {
    version: "2.0.0",
    date: "2024-01-05",
    type: "major",
    title: "Major Platform Update",
    description: "Complete redesign with new features, improved performance, and better user experience.",
    changes: [
      { type: "new", text: "Completely redesigned user interface" },
      { type: "new", text: "Advanced bookmark organization with nested folders" },
      { type: "new", text: "Collaboration features for team bookmark sharing" },
      { type: "new", text: "Mobile app for iOS and Android" },
      { type: "improvement", text: "Improved browser extension with better capture" },
      { type: "improvement", text: "Enhanced API with more endpoints" },
    ]
  },
  {
    version: "1.8.2",
    date: "2023-12-20",
    type: "fix",
    title: "Holiday Bug Fixes",
    description: "Critical bug fixes and security updates before the holidays.",
    changes: [
      { type: "fix", text: "Fixed bookmark export functionality" },
      { type: "fix", text: "Resolved authentication issues with OAuth providers" },
      { type: "security", text: "Enhanced security measures for user data protection" },
    ]
  },
  {
    version: "1.8.0",
    date: "2023-12-15",
    type: "feature",
    title: "Enhanced Integration Suite",
    description: "New integrations and improved workflows for power users.",
    changes: [
      { type: "new", text: "Zapier integration for workflow automation" },
      { type: "new", text: "Notion integration for seamless note-taking" },
      { type: "new", text: "Slack integration for team bookmark sharing" },
      { type: "improvement", text: "Better import from popular bookmark services" },
    ]
  },
];