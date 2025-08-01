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
import { ExtractMetadataTool } from "./extract-metadata-tool";

export const metadata = {
  title:
    "Free Website Metadata Extractor | Extract Meta Tags, Open Graph & JSON-LD",
  description:
    "Extract comprehensive website metadata including Open Graph, Twitter Cards, JSON-LD structured data, and technical meta tags from any URL. Free online SEO analysis tool.",
  keywords:
    "metadata extractor, meta tags analyzer, open graph extractor, twitter cards, json-ld extractor, structured data, seo meta tags, website analysis, free seo tool",
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
    canonical: "/tools/extract-metadata",
  },
  openGraph: {
    title: "Free Website Metadata Extractor Tool",
    description:
      "Extract and analyze comprehensive website metadata including Open Graph, Twitter Cards, JSON-LD, and technical meta tags instantly.",
    type: "website",
    url: "/tools/extract-metadata",
    siteName: "SaveIt.now",
    locale: "en_US",
    images: [
      {
        url: "/og-images/tools/extract-metadata.png",
        width: 1200,
        height: 630,
        alt: "Metadata Extractor Tool - Extract meta tags, Open Graph, and structured data",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Website Metadata Extractor Tool",
    description:
      "Extract comprehensive metadata from any website including Open Graph, Twitter Cards, and JSON-LD structured data.",
    images: ["/og-images/tools/extract-metadata.png"],
  },
};

export default function ExtractMetadataToolPage() {
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
            🔍 Metadata Extractor
          </Badge>
          <Typography variant="h1" className="mb-6">
            Free Website Metadata Extractor
          </Typography>
          <Typography variant="lead" className="mb-8 max-w-4xl mx-auto">
            Extract essential metadata and preview how your website appears on
            social media platforms.
          </Typography>
          <ul className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Essential Metadata</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Social Media Preview</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Instant Results</Typography>
            </li>
          </ul>
        </MaxWidthContainer>
        {/* Tool Section */}
        <MaxWidthContainer className="py-12">
          <ExtractMetadataTool />
        </MaxWidthContainer>
      </div>

      {/* SEO Content Section */}
      <MaxWidthContainer spacing="sm" className="flex flex-col gap-8 lg:gap-12">
        <Typography variant="h2" className="">
          Complete Guide to Website Metadata Extraction
        </Typography>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>What is Website Metadata?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Metadata is structured information embedded in HTML that describes
                your web page content. It includes title tags, meta descriptions,
                Open Graph data, Twitter Cards, and technical tags that help
                search engines and social platforms understand your content.
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why Extract Metadata?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Analyzing metadata helps optimize SEO performance, improve social
                media sharing, and ensure your content appears correctly across
                platforms. Proper metadata can increase click-through rates by up
                to 30% and improve search rankings.
              </Typography>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How to Use Our Metadata Extractor</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-4">
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">1.</span>
                <div>
                  <Typography variant="small">Enter the URL:</Typography>
                  <Typography variant="muted">
                    Paste any website URL into the input field above
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">2.</span>
                <div>
                  <Typography variant="small">Extract Metadata:</Typography>
                  <Typography variant="muted">
                    Our tool analyzes the webpage and extracts all metadata tags
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">3.</span>
                <div>
                  <Typography variant="small">Review Results:</Typography>
                  <Typography variant="muted">
                    View organized metadata including standard, Open Graph, and Twitter tags
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">4.</span>
                <div>
                  <Typography variant="small">Preview Social Cards:</Typography>
                  <Typography variant="muted">
                    See how your content appears on Facebook and Twitter
                  </Typography>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Essential Metadata Tags for SEO</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Title Tag:</Typography>
                  <Typography variant="muted">
                    Keep between 50-60 characters, include primary keyword, make it compelling
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Meta Description:</Typography>
                  <Typography variant="muted">
                    150-160 characters that summarize your page content and encourage clicks
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Open Graph Tags:</Typography>
                  <Typography variant="muted">
                    Optimize for social sharing with og:title, og:description, and og:image
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Twitter Cards:</Typography>
                  <Typography variant="muted">
                    Enhance Twitter sharing with twitter:card, twitter:title, and twitter:description
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Canonical URL:</Typography>
                  <Typography variant="muted">
                    Prevent duplicate content issues by specifying the preferred URL version
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Robots Meta Tag:</Typography>
                  <Typography variant="muted">
                    Control how search engines index and follow links on your page
                  </Typography>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </MaxWidthContainer>

      {/* SaveIt.now CTA Section */}
      <SaveItCTA
        title="Save and organize your research with SaveIt.now"
        description="Keep track of all the websites you analyze, bookmark important resources, and organize your SEO research efficiently."
      />

      {/* Related Tools */}
      <MaxWidthContainer className="py-16">
        <Typography variant="h2" className="text-center mb-12">
          Related Tools
        </Typography>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                Free OG Image & Twitter Card Extractor
              </CardTitle>
              <CardDescription>
                Extract and preview Open Graph images and Twitter cards from any URL for social media optimization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Typography variant="link" className="text-sm font-medium">
                Try OG Image Tool →
              </Typography>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                How to Optimize Meta Tags for Better SEO
              </CardTitle>
              <CardDescription>
                Learn best practices for writing compelling title tags and meta descriptions that improve search rankings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Typography variant="link" className="text-sm font-medium">
                Read Guide →
              </Typography>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                Social Media Meta Tags Checklist
              </CardTitle>
              <CardDescription>
                Complete checklist for optimizing Open Graph and Twitter Card meta tags for maximum engagement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Typography variant="link" className="text-sm font-medium">
                Get Checklist →
              </Typography>
            </CardContent>
          </Card>
        </div>
      </MaxWidthContainer>

      <Footer />
    </div>
  );
}
