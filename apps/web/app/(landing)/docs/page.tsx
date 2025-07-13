import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowRight, Book, Code, Download, Globe, Puzzle, Zap } from "lucide-react";
import Link from "next/link";

// Mock documentation sections - in a real implementation, this would come from your docs content
const docSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of SaveIt and set up your account for maximum productivity.",
    icon: Zap,
    docs: [
      { title: "Quick Start Guide", description: "Get up and running in 5 minutes" },
      { title: "Account Setup", description: "Configure your profile and preferences" },
      { title: "First Bookmarks", description: "Save your first links and organize them" },
    ]
  },
  {
    id: "browser-extensions",
    title: "Browser Extensions", 
    description: "Install and use our browser extensions for Chrome, Firefox, and more.",
    icon: Puzzle,
    docs: [
      { title: "Chrome Extension", description: "Install and configure for Chrome" },
      { title: "Firefox Extension", description: "Install and configure for Firefox" },
      { title: "Extension Features", description: "Advanced features and shortcuts" },
    ]
  },
  {
    id: "api",
    title: "API Reference",
    description: "Integrate SaveIt with your applications using our REST API.",
    icon: Code,
    docs: [
      { title: "Authentication", description: "API keys and authentication methods" },
      { title: "Bookmarks API", description: "Create, read, update, and delete bookmarks" },
      { title: "Search API", description: "Search your bookmarks programmatically" },
    ]
  },
  {
    id: "features",
    title: "Features Guide",
    description: "Deep dive into SaveIt's powerful features and capabilities.",
    icon: Book,
    docs: [
      { title: "AI-Powered Search", description: "Smart search and content discovery" },
      { title: "Tags & Organization", description: "Organize bookmarks with tags and folders" },
      { title: "Collaboration", description: "Share bookmarks with your team" },
    ]
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "Connect SaveIt with your favorite tools and workflows.",
    icon: Globe,
    docs: [
      { title: "Zapier Integration", description: "Automate with 1000+ apps" },
      { title: "Notion Integration", description: "Sync bookmarks to Notion" },
      { title: "Slack Integration", description: "Share bookmarks in Slack" },
    ]
  },
  {
    id: "export-import",
    title: "Import & Export",
    description: "Move your bookmarks to and from other bookmark managers.",
    icon: Download,
    docs: [
      { title: "Import from Chrome", description: "Import your Chrome bookmarks" },
      { title: "Import from Firefox", description: "Import your Firefox bookmarks" },
      { title: "Export Options", description: "Export your data in various formats" },
    ]
  },
];

export default function DocsPage() {
  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col gap-16">
          {/* Header Section */}
          <div className="text-center space-y-6">
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              <Book className="size-3 mr-1" />
              Documentation
            </Badge>
            <Typography variant="h1" className="max-w-3xl mx-auto">
              Everything you need to master SaveIt
            </Typography>
            <Typography variant="lead" className="max-w-2xl mx-auto text-muted-foreground">
              Comprehensive guides, API references, and tutorials to help you get the most out of SaveIt's powerful bookmark management features.
            </Typography>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="size-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Quick Start</CardTitle>
                <CardDescription>Get started in minutes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/docs/quick-start">
                    Start Here
                    <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 hover:border-blue-500/40 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 size-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Code className="size-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">API Reference</CardTitle>
                <CardDescription>Integrate with your apps</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/docs/api">
                    View API
                    <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-green-500/20 hover:border-green-500/40 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 size-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Puzzle className="size-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Extensions</CardTitle>
                <CardDescription>Browser integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/docs/extensions">
                    Download
                    <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Documentation Sections */}
          <div className="space-y-12">
            <Typography variant="h2" className="text-center">Browse Documentation</Typography>
            <div className="grid gap-8 lg:grid-cols-2">
              {docSections.map((section) => {
                const IconComponent = section.icon;
                return (
                  <Card key={section.id} className="h-fit">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <IconComponent className="size-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle>{section.title}</CardTitle>
                          <CardDescription>{section.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {section.docs.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div>
                            <div className="font-medium text-sm">{doc.title}</div>
                            <div className="text-xs text-muted-foreground">{doc.description}</div>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/docs/${section.id}/${doc.title.toLowerCase().replace(/\s+/g, '-')}`}>
                              <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" asChild className="w-full mt-4">
                        <Link href={`/docs/${section.id}`}>
                          View All {section.title}
                          <ArrowRight className="size-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Help Section */}
          <div className="text-center space-y-6 bg-muted/30 rounded-lg p-8">
            <Typography variant="h3">Need more help?</Typography>
            <Typography variant="muted" className="max-w-md mx-auto">
              Can't find what you're looking for? We're here to help you succeed with SaveIt.
            </Typography>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link href="/contact">Contact Support</Link>
              </Button>
              <Button asChild>
                <Link href="/help">Visit Help Center</Link>
              </Button>
            </div>
          </div>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}