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
import { ExtractFaviconsTool } from "./extract-favicons-tool";

export const metadata = {
  title: "Free Favicon Extractor & Downloader | Extract All Website Icons",
  description:
    "Extract and download all favicon variants from any website including Apple touch icons, Android icons, and standard favicons in various sizes and formats. Free online tool.",
  keywords:
    "favicon extractor, favicon downloader, apple touch icon, android icon, website icons, ico png svg, favicon sizes, icon collection tool",
  alternates: {
    canonical: "/tools/extract-favicons",
  },
  openGraph: {
    title: "Free Favicon Extractor & Downloader Tool",
    description:
      "Extract all favicon variants from any website instantly. Download Apple touch icons, Android icons, and standard favicons in all sizes and formats.",
    type: "website",
    url: "/tools/extract-favicons",
    siteName: "SaveIt.now",
    locale: "en_US",
    images: [
      {
        url: "/og-images/tools/extract-favicons.png",
        width: 1200,
        height: 630,
        alt: "Favicon Extractor Tool - Download all website icons and favicons",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Favicon Extractor & Downloader Tool",
    description:
      "Extract and download all favicon variants from any website. Perfect for design research and icon collection.",
    images: ["/og-images/tools/extract-favicons.png"],
  },
};

export default function ExtractFaviconsToolPage() {
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
            🎯 Favicon Extractor
          </Badge>
          <Typography variant="h1" className="mb-6">
            Free Favicon Extractor & Downloader
          </Typography>
          <Typography variant="lead" className="mb-8 max-w-4xl mx-auto">
            Extract and download all favicon variants from any website including
            Apple touch icons, Android icons, standard favicons, and SVG icons
            in all available sizes and formats.
          </Typography>
          <ul className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">All Favicon Formats</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Bulk Download</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Free Forever</Typography>
            </li>
          </ul>
        </MaxWidthContainer>
        {/* Tool Section */}
        <MaxWidthContainer className="py-12">
          <ExtractFaviconsTool />
        </MaxWidthContainer>
      </div>

      {/* SEO Content Section */}
      <MaxWidthContainer spacing="sm" className="flex flex-col gap-8 lg:gap-12">
        <Typography variant="h2" className="">
          Complete Guide to Website Favicons and Icons
        </Typography>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>What are Favicons?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Favicons are small icons that represent websites in browser
                tabs, bookmarks, and mobile home screens. Modern websites use
                multiple favicon variants to ensure perfect display across all
                devices and platforms, from 16x16 pixel browser tabs to 512x512
                pixel PWA icons.
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why Extract Favicons?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Extracting favicons is essential for design research, competitor
                analysis, icon collection, and understanding how brands
                represent themselves visually. It's also useful for developers
                studying favicon implementation best practices.
              </Typography>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How to Use Our Favicon Extractor Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-4">
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">1.</span>
                <div>
                  <Typography variant="small">Enter Website URL:</Typography>
                  <Typography variant="muted">
                    Paste any website URL into the input field above
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">2.</span>
                <div>
                  <Typography variant="small">Extract Favicons:</Typography>
                  <Typography variant="muted">
                    Our tool scans the website for all favicon variants
                    including hidden and standard locations
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">3.</span>
                <div>
                  <Typography variant="small">Browse Results:</Typography>
                  <Typography variant="muted">
                    View all discovered favicons with their sizes, formats, and
                    platform-specific information
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">4.</span>
                <div>
                  <Typography variant="small">Download Icons:</Typography>
                  <Typography variant="muted">
                    Download individual favicons or use bulk download to get all
                    valid icons at once
                  </Typography>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Types of Favicons Our Tool Detects</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Standard Favicon:</Typography>
                  <Typography variant="muted">
                    Classic favicon.ico file displayed in browser tabs and
                    bookmarks
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Apple Touch Icons:</Typography>
                  <Typography variant="muted">
                    High-resolution icons used for iOS Safari bookmarks and home
                    screen shortcuts
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Android Icons:</Typography>
                  <Typography variant="muted">
                    Progressive Web App icons for Android devices and Chrome
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">SVG Icons:</Typography>
                  <Typography variant="muted">
                    Scalable vector icons that look crisp at any size
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Microsoft Tile Icons:</Typography>
                  <Typography variant="muted">
                    Windows-specific icons for Start Menu tiles and
                    notifications
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Multiple Sizes:</Typography>
                  <Typography variant="muted">
                    From 16x16 pixels for browser tabs to 512x512 pixels for PWA
                    icons
                  </Typography>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common Use Cases for Favicon Extraction</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Design Research:</Typography>
                  <Typography variant="muted">
                    Study how competitors and industry leaders design their
                    brand icons
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Icon Collection:</Typography>
                  <Typography variant="muted">
                    Build a library of high-quality icons for inspiration or
                    reference
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">
                    Development Reference:
                  </Typography>
                  <Typography variant="muted">
                    Learn favicon implementation best practices from real
                    websites
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Brand Analysis:</Typography>
                  <Typography variant="muted">
                    Analyze how brands adapt their logos for different icon
                    sizes and contexts
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Quality Assurance:</Typography>
                  <Typography variant="muted">
                    Verify that your own website has all necessary favicon
                    variants implemented
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
          Related Tools & Resources
        </Typography>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                How to Create Perfect Favicons for All Devices
              </CardTitle>
              <CardDescription>
                Complete guide to designing and implementing favicons that work
                perfectly across all browsers, devices, and platforms.
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
                Favicon Size Guide: Which Sizes Do You Really Need?
              </CardTitle>
              <CardDescription>
                Learn which favicon sizes are essential for modern websites and
                which ones you can skip to optimize loading times.
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
                Progressive Web App Icons: A Complete Implementation Guide
              </CardTitle>
              <CardDescription>
                Everything you need to know about implementing PWA icons for
                Android, iOS, and desktop applications.
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
