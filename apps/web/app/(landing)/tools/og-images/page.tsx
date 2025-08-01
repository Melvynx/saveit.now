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
import { OGImageTool } from "./og-image-tool";

export const metadata = {
  title: "Free OG Image & Twitter Card Extractor | Open Graph Meta Tags Tool",
  description:
    "Extract Open Graph images, Twitter cards, and social media meta tags from any URL. Free online tool to preview how your links appear on social media platforms.",
  keywords:
    "og image extractor, twitter card, open graph, meta tags, social media preview, facebook preview, linkedin preview, free SEO tool",
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
    canonical: "/tools/og-images",
  },
  openGraph: {
    title: "Free OG Image & Twitter Card Extractor Tool",
    description:
      "Extract and preview Open Graph images and Twitter cards from any URL instantly. Perfect for social media optimization and SEO.",
    type: "website",
    url: "/tools/og-images",
    siteName: "SaveIt.now",
    locale: "en_US",
    images: [
      {
        url: "/og-images/tools/og-images.png",
        width: 1200,
        height: 630,
        alt: "OG Image Extractor Tool - Extract Open Graph images and Twitter cards",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free OG Image & Twitter Card Extractor Tool",
    description:
      "Extract Open Graph images and Twitter cards from any URL. Free online tool for social media optimization.",
    images: ["/og-images/tools/og-images.png"],
  },
};

export default function OGImageToolPage() {
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
            🖼️ OG Image Extractor
          </Badge>
          <Typography variant="h1" className="mb-6">
            Free OG Image & Twitter Card Extractor
          </Typography>
          <Typography variant="lead" className="mb-8 max-w-4xl mx-auto">
            Extract Open Graph images, Twitter cards, and social media meta tags
            from any URL instantly. Preview how your links will appear on
            Facebook, Twitter, LinkedIn, and other social platforms.
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
              <Typography variant="muted">Instant Results</Typography>
            </li>
          </ul>
        </MaxWidthContainer>
        {/* Tool Section */}
        <MaxWidthContainer className="py-12">
          <OGImageTool />
        </MaxWidthContainer>
      </div>

      {/* SEO Content Section */}
      <MaxWidthContainer spacing="sm" className="flex flex-col gap-8 lg:gap-12">
        <Typography variant="h2" className="">
          Everything You Need to Know About Open Graph Images
        </Typography>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>What are Open Graph Images?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Open Graph images are the preview images that appear when you
                share a link on social media platforms like Facebook, Twitter,
                LinkedIn, and WhatsApp. These meta tags were created by Facebook
                to standardize how content appears when shared across social
                networks.
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why Are OG Images Important?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                OG images significantly impact click-through rates and
                engagement on social media. Posts with compelling images receive
                2.3x more engagement than those without. They help create a
                professional appearance and improve your content's visibility in
                social feeds.
              </Typography>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How to Use Our OG Image Extractor Tool</CardTitle>
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
                  <Typography variant="small">Click Extract:</Typography>
                  <Typography variant="muted">
                    Our tool will fetch and analyze all meta tags from the
                    webpage
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">3.</span>
                <div>
                  <Typography variant="small">View Results:</Typography>
                  <Typography variant="muted">
                    See the Open Graph image, Twitter card, and all social media
                    metadata
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">4.</span>
                <div>
                  <Typography variant="small">
                    Preview Social Shares:
                  </Typography>
                  <Typography variant="muted">
                    Understand exactly how your link will appear on different
                    platforms
                  </Typography>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best Practices for Open Graph Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Optimal Size:</Typography>
                  <Typography variant="muted">
                    Use 1200x630 pixels for the best compatibility across all
                    platforms
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">File Format:</Typography>
                  <Typography variant="muted">
                    PNG or JPG formats work best, keep file size under 8MB
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Text Overlay:</Typography>
                  <Typography variant="muted">
                    If using text, make it large and readable on mobile devices
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Brand Consistency:</Typography>
                  <Typography variant="muted">
                    Include your logo or brand colors for recognition
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">High Quality:</Typography>
                  <Typography variant="muted">
                    Use high-resolution images that look good at different sizes
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Avoid Small Text:</Typography>
                  <Typography variant="muted">
                    Text smaller than 20px may not be readable in previews
                  </Typography>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </MaxWidthContainer>

      {/* SaveIt.now CTA Section */}
      <SaveItCTA />

      {/* Related Articles */}
      <MaxWidthContainer className="py-16">
        <Typography variant="h2" className="text-center mb-12">
          Related
        </Typography>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                How to Optimize Open Graph Images for Social Media
              </CardTitle>
              <CardDescription>
                Learn the best practices for creating compelling OG images that
                drive engagement and clicks on social platforms.
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
                Twitter Card Types and When to Use Them
              </CardTitle>
              <CardDescription>
                Understanding the different Twitter card types and how to choose
                the right one for your content.
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
                Meta Tags That Actually Matter for SEO
              </CardTitle>
              <CardDescription>
                A comprehensive guide to the most important meta tags for search
                engine optimization and social sharing.
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
