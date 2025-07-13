import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Calendar, GitBranch, Plus, Settings, Sparkles, Zap } from "lucide-react";

// Changelog data - in a real implementation, this would come from markdown files or a CMS
const changelogEntries = [
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

const getTypeIcon = (type: string) => {
  switch (type) {
    case "major": return <Sparkles className="size-4" />;
    case "feature": return <Plus className="size-4" />;
    case "improvement": return <Zap className="size-4" />;
    case "fix": return <Settings className="size-4" />;
    default: return <GitBranch className="size-4" />;
  }
};

const getTypeBadge = (type: string) => {
  switch (type) {
    case "major": return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Major Release</Badge>;
    case "feature": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">New Features</Badge>;
    case "improvement": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Improvements</Badge>;
    case "fix": return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Bug Fixes</Badge>;
    default: return <Badge variant="secondary">Update</Badge>;
  }
};

const getChangeIcon = (type: string) => {
  switch (type) {
    case "new": return "🎉";
    case "improvement": return "⚡";
    case "fix": return "🐛";
    case "security": return "🔒";
    default: return "📝";
  }
};

export default function ChangelogPage() {
  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col gap-16">
          {/* Header Section */}
          <div className="text-center space-y-6">
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <GitBranch className="size-3 mr-1" />
              Changelog
            </Badge>
            <Typography variant="h1" className="max-w-3xl mx-auto">
              What's new in SaveIt
            </Typography>
            <Typography variant="lead" className="max-w-2xl mx-auto text-muted-foreground">
              Stay up-to-date with the latest features, improvements, and bug fixes. We're constantly working to make SaveIt better for you.
            </Typography>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-2 size-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Plus className="size-6 text-green-600" />
                </div>
                <CardTitle className="text-2xl">15+</CardTitle>
                <CardDescription>New Features This Quarter</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-2 size-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Zap className="size-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">40%</CardTitle>
                <CardDescription>Performance Improvement</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-2 size-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="size-6 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">2.1</CardTitle>
                <CardDescription>Latest Version</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Changelog Timeline */}
          <div className="space-y-8">
            <Typography variant="h2" className="text-center">Release History</Typography>
            
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden md:block" />
              
              <div className="space-y-8">
                {changelogEntries.map((entry, index) => (
                  <div key={entry.version} className="relative">
                    {/* Timeline Dot */}
                    <div className="absolute left-6 size-4 rounded-full bg-background border-2 border-primary hidden md:flex md:items-center md:justify-center">
                      <div className="size-1.5 rounded-full bg-primary" />
                    </div>
                    
                    {/* Content */}
                    <div className="md:ml-16">
                      <Card className={index === 0 ? "border-primary/40 bg-primary/5" : ""}>
                        <CardHeader>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                {getTypeIcon(entry.type)}
                              </div>
                              <div>
                                <CardTitle className="flex items-center gap-2">
                                  v{entry.version} • {entry.title}
                                  {index === 0 && <Badge className="bg-primary/20 text-primary">Latest</Badge>}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="size-4 text-muted-foreground" />
                                  <CardDescription>
                                    {new Date(entry.date).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric"
                                    })}
                                  </CardDescription>
                                </div>
                              </div>
                            </div>
                            {getTypeBadge(entry.type)}
                          </div>
                          <CardDescription className="text-base mt-2">
                            {entry.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {entry.changes.map((change, changeIndex) => (
                              <div key={changeIndex} className="flex items-start gap-3">
                                <span className="text-lg leading-none mt-0.5">
                                  {getChangeIcon(change.type)}
                                </span>
                                <span className="text-sm leading-relaxed">
                                  {change.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subscribe Section */}
          <div className="text-center space-y-6 bg-muted/30 rounded-lg p-8">
            <Typography variant="h3">Stay Updated</Typography>
            <Typography variant="muted" className="max-w-md mx-auto">
              Want to be the first to know about new features and updates? Follow our progress and get notified about releases.
            </Typography>
            <div className="flex gap-4 justify-center flex-wrap">
              <Badge variant="outline" className="text-muted-foreground">
                📧 Email notifications coming soon
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                🐦 Follow us on Twitter
              </Badge>
            </div>
          </div>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}