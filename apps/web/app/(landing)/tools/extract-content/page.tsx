import { SaveItCTA } from "@/components/tools/saveit-cta";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { CheckCircle } from "lucide-react";
import { ExtractContentTool } from "./extract-content-tool";

export const metadata = {
  title: "Free Website Content Extractor | Clean Text & Markdown Tool",
  description:
    "Extract clean, readable content from any webpage. Get both plain text and markdown formats with content statistics. Perfect for research, archiving, and content analysis.",
  keywords:
    "content extractor, web scraping, article extraction, text extraction, markdown converter, reading time calculator, content analysis, research tool",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/tools/extract-content",
  },
  openGraph: {
    title: "Free Website Content Extractor Tool",
    description:
      "Extract clean content from any webpage instantly. Get both text and markdown formats with reading time and statistics.",
    type: "website",
    url: "/tools/extract-content",
    siteName: "SaveIt.now",
    locale: "en_US",
    images: [
      {
        url: "/og-images/tools/extract-content.png",
        width: 1200,
        height: 630,
        alt: "Website Content Extractor Tool - Extract clean text and markdown from any webpage",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Website Content Extractor Tool",
    description:
      "Extract clean, readable content from websites. Perfect for research and content analysis.",
    images: ["/og-images/tools/extract-content.png"],
  },
};

export default function ExtractContentToolPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section with H1 */}
      <div
        style={{
          // @ts-expect-error CSS custom property
          "--box-color": "color-mix(in srgb, var(--border) 30%, transparent)",
        }}
        className="bg-background flex-1 flex flex-col bg-opacity-80 [background-image:linear-gradient(var(--box-color)_1px,transparent_1px),linear-gradient(to_right,var(--box-color)_1px,transparent_1px)] [background-size:20px_20px] border-b border-border/30"
      >
        <MaxWidthContainer width="lg" className="text-center py-16">
          <Badge variant="outline" className="mb-6">
            📄 Content Extractor
          </Badge>
          <Typography variant="h1" className="mb-6">
            Free Website Content Extractor
          </Typography>
          <Typography variant="lead" className="mb-8 max-w-4xl mx-auto">
            Extract clean, readable content from any webpage instantly. Get both
            plain text and markdown formats with detailed content statistics
            including word count, reading time, and more.
          </Typography>
          <ul className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Free Forever</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">No Registration Required</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Multiple Output Formats</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Content Statistics</Typography>
            </li>
          </ul>
        </MaxWidthContainer>
        {/* Tool Section */}
        <MaxWidthContainer className="py-12">
          <ExtractContentTool />
        </MaxWidthContainer>
      </div>

      {/* SEO Content Section */}
      <MaxWidthContainer spacing="sm" className="flex flex-col gap-8 lg:gap-12">
        <Typography variant="h2" className="">
          Everything You Need to Know About Content Extraction
        </Typography>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>What is Content Extraction?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Content extraction is the process of automatically extracting the
                main readable content from web pages, removing navigation,
                advertisements, and other clutter. Our tool focuses on the main
                article or content area, providing clean text and markdown
                formats perfect for reading, research, or archiving.
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why Use a Content Extractor?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Content extractors save time by automatically cleaning web pages
                and providing distraction-free reading. They're essential for
                researchers, writers, and content creators who need to process
                large amounts of web content efficiently while maintaining
                readability and structure.
              </Typography>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How to Use Our Content Extraction Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-4">
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">1.</span>
                <div>
                  <Typography variant="small">Enter the URL:</Typography>
                  <Typography variant="muted">
                    Paste any article or webpage URL into the input field above
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">2.</span>
                <div>
                  <Typography variant="small">Extract Content:</Typography>
                  <Typography variant="muted">
                    Our tool will fetch the page and extract the main content
                    while removing ads, navigation, and clutter
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">3.</span>
                <div>
                  <Typography variant="small">View Statistics:</Typography>
                  <Typography variant="muted">
                    See word count, character count, reading time, and paragraph
                    statistics for the extracted content
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">4.</span>
                <div>
                  <Typography variant="small">Download or Copy:</Typography>
                  <Typography variant="muted">
                    Get the content in plain text or markdown format, or copy it
                    directly to your clipboard
                  </Typography>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Common Use Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                  <div>
                    <Typography variant="small">Research & Analysis:</Typography>
                    <Typography variant="muted">
                      Extract content for academic research, market analysis, or
                      competitive intelligence
                    </Typography>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                  <div>
                    <Typography variant="small">Content Archiving:</Typography>
                    <Typography variant="muted">
                      Save clean versions of important articles for offline
                      reading or backup purposes
                    </Typography>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                  <div>
                    <Typography variant="small">Content Migration:</Typography>
                    <Typography variant="muted">
                      Extract content when migrating between different content
                      management systems
                    </Typography>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                  <div>
                    <Typography variant="small">Accessibility:</Typography>
                    <Typography variant="muted">
                      Create clean, readable versions of content for screen
                      readers and accessibility tools
                    </Typography>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Output Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                  <div>
                    <Typography variant="small">Plain Text (.txt):</Typography>
                    <Typography variant="muted">
                      Clean text without any formatting, perfect for text
                      analysis or simple reading
                    </Typography>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                  <div>
                    <Typography variant="small">Markdown (.md):</Typography>
                    <Typography variant="muted">
                      Structured content with headings, lists, and formatting
                      preserved for documentation
                    </Typography>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                  <div>
                    <Typography variant="small">Statistics:</Typography>
                    <Typography variant="muted">
                      Word count, character count, paragraph count, and estimated
                      reading time
                    </Typography>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                  <div>
                    <Typography variant="small">Metadata:</Typography>
                    <Typography variant="muted">
                      Article title, description, author, and publication date
                      when available
                    </Typography>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </MaxWidthContainer>

      {/* SaveIt.now CTA Section */}
      <SaveItCTA />

      {/* Related Articles */}
      <MaxWidthContainer className="py-16">
        <Typography variant="h2" className="text-center mb-12">
          Related Tools
        </Typography>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                Web Scraping Best Practices
              </CardTitle>
              <CardDescription>
                Learn ethical web scraping techniques and how to extract content
                responsibly while respecting website policies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Typography variant="link" className="text-sm font-medium">
                Read more →
              </Typography>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                Markdown vs. Plain Text: When to Use Each
              </CardTitle>
              <CardDescription>
                Understanding the differences between markdown and plain text
                formats and choosing the right one for your needs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Typography variant="link" className="text-sm font-medium">
                Read more →
              </Typography>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                Content Analysis Techniques
              </CardTitle>
              <CardDescription>
                Methods for analyzing extracted content including readability
                scores, keyword density, and sentiment analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Typography variant="link" className="text-sm font-medium">
                Read more →
              </Typography>
            </CardContent>
          </Card>
        </div>
      </MaxWidthContainer>

      <Footer />
    </div>
  );
}