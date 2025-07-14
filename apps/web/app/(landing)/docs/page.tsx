import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowRight, Book, Code, Download, Globe, Puzzle, Zap, FileText, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { getGroupedDocs } from "@/lib/mdx/docs-manager";

// Icon mapping for categories
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Getting Started": Zap,
  "Browser Extensions": Puzzle,
  "API Reference": Code,
  "Features": Book,
  "Integrations": Globe,
  "Import & Export": Download,
  "Settings": Settings,
  "Security": Shield,
  "General": FileText,
};

export default async function DocsPage() {
  const groupedDocs = await getGroupedDocs();
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
            {groupedDocs.length === 0 ? (
              <div className="text-center space-y-4 py-8">
                <Typography variant="h3" className="text-muted-foreground">Documentation coming soon</Typography>
                <Typography variant="muted" className="max-w-md mx-auto">
                  We're working on comprehensive documentation to help you get the most out of SaveIt.
                </Typography>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                {groupedDocs.map((group) => {
                  const IconComponent = categoryIcons[group.category] || FileText;
                  return (
                    <Card key={group.category} className="h-fit">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <IconComponent className="size-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>{group.category}</CardTitle>
                            <CardDescription>{group.docs.length} articles</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {group.docs.slice(0, 3).map((doc) => (
                          <div key={doc.slug} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div>
                              <div className="font-medium text-sm">{doc.frontmatter.title}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{doc.frontmatter.description}</div>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/docs/${doc.slug}`}>
                                <ArrowRight className="size-4" />
                              </Link>
                            </Button>
                          </div>
                        ))}
                        {group.docs.length > 3 && (
                          <div className="text-center text-sm text-muted-foreground pt-2">
                            +{group.docs.length - 3} more articles
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
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