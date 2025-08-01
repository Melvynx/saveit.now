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
import { YoutubeMetadataTool } from "./youtube-metadata-tool";

export const metadata = {
  title: "Free YouTube Metadata Extractor | Get Video Info, Thumbnails & Channel Data",
  description:
    "Extract comprehensive metadata from any YouTube video including title, description, thumbnails, channel info, view count, and duration. Free online tool with bulk thumbnail download.",
  keywords:
    "youtube metadata extractor, youtube video info, youtube thumbnails, video metadata, youtube analytics, channel data, video statistics, thumbnail downloader",
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
    canonical: "/tools/youtube-metadata",
  },
  openGraph: {
    title: "Free YouTube Metadata Extractor Tool",
    description:
      "Extract all YouTube video metadata instantly. Get title, description, thumbnails, channel info, and statistics from any YouTube video URL.",
    type: "website",
    url: "/tools/youtube-metadata",
    siteName: "SaveIt.now",
    locale: "en_US",
    images: [
      {
        url: "/og-images/tools/youtube-metadata.png",
        width: 1200,
        height: 630,
        alt: "YouTube Metadata Extractor Tool - Extract video info, thumbnails, and channel data",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free YouTube Metadata Extractor Tool",
    description:
      "Extract YouTube video metadata, thumbnails, and statistics. Perfect for content creators and researchers.",
    images: ["/og-images/tools/youtube-metadata.png"],
  },
};

export default function YoutubeMetadataToolPage() {
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
            📺 YouTube Metadata
          </Badge>
          <Typography variant="h1" className="mb-6">
            Free YouTube Metadata Extractor
          </Typography>
          <Typography variant="lead" className="mb-8 max-w-4xl mx-auto">
            Extract comprehensive metadata from any YouTube video including title, 
            description, thumbnails, channel information, view count, duration, 
            and publication date.
          </Typography>
          <ul className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">All Thumbnail Qualities</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Complete Metadata</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Free Forever</Typography>
            </li>
          </ul>
        </MaxWidthContainer>
        {/* Tool Section */}
        <MaxWidthContainer className="py-12">
          <YoutubeMetadataTool />
        </MaxWidthContainer>
      </div>

      {/* SEO Content Section */}
      <MaxWidthContainer spacing="sm" className="flex flex-col gap-8 lg:gap-12">
        <Typography variant="h2" className="">
          Complete Guide to YouTube Video Metadata
        </Typography>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>What is YouTube Metadata?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                YouTube metadata includes all the information associated with a video: 
                title, description, thumbnails, channel details, view count, duration, 
                publication date, and technical identifiers. This data helps with 
                content analysis, research, and understanding video performance.
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why Extract YouTube Metadata?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Extracting YouTube metadata is essential for content creators, 
                researchers, marketers, and developers. It enables competitive 
                analysis, thumbnail research, content planning, data analysis, 
                and understanding video optimization strategies.
              </Typography>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How to Use Our YouTube Metadata Extractor</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-4">
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">1.</span>
                <div>
                  <Typography variant="small">Enter YouTube URL:</Typography>
                  <Typography variant="muted">
                    Paste any YouTube video URL (youtube.com, youtu.be, or shorts)
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">2.</span>
                <div>
                  <Typography variant="small">Extract Metadata:</Typography>
                  <Typography variant="muted">
                    Our tool fetches comprehensive video information including 
                    hidden metadata and all thumbnail qualities
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">3.</span>
                <div>
                  <Typography variant="small">View Results:</Typography>
                  <Typography variant="muted">
                    Browse video details, channel information, statistics, 
                    and thumbnail gallery with all available qualities
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">4.</span>
                <div>
                  <Typography variant="small">Download & Export:</Typography>
                  <Typography variant="muted">
                    Download thumbnails individually or in bulk, copy metadata 
                    as JSON, or export for further analysis
                  </Typography>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>YouTube Metadata Our Tool Extracts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Video Information:</Typography>
                  <Typography variant="muted">
                    Title, description, duration, view count, and publication date
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Channel Details:</Typography>
                  <Typography variant="muted">
                    Channel name, channel ID, and creator information
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Thumbnail Gallery:</Typography>
                  <Typography variant="muted">
                    All 5 thumbnail qualities: default (120x90), medium (320x180), 
                    high (480x360), standard (640x480), and max resolution (1280x720)
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Technical Data:</Typography>
                  <Typography variant="muted">
                    Video ID, canonical URL, and structured metadata
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Export Options:</Typography>
                  <Typography variant="muted">
                    JSON export, individual thumbnail downloads, and bulk operations
                  </Typography>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common Use Cases for YouTube Metadata Extraction</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Content Research:</Typography>
                  <Typography variant="muted">
                    Analyze competitor videos, study trending content, and research 
                    successful video strategies in your niche
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Thumbnail Analysis:</Typography>
                  <Typography variant="muted">
                    Study high-performing thumbnails, collect design inspiration, 
                    and analyze thumbnail effectiveness across different qualities
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">SEO & Marketing:</Typography>
                  <Typography variant="muted">
                    Research keywords in titles and descriptions, analyze video 
                    performance metrics, and study content optimization
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Data Collection:</Typography>
                  <Typography variant="muted">
                    Build datasets for research, collect video statistics, 
                    and monitor content performance over time
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Development & APIs:</Typography>
                  <Typography variant="muted">
                    Prototype YouTube integrations, test video data processing, 
                    and understand YouTube's metadata structure
                  </Typography>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>YouTube Thumbnail Quality Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Max Resolution (1280x720):</Typography>
                  <Typography variant="muted">
                    Highest quality thumbnail, perfect for previews and high-resolution displays. 
                    Not available for all videos.
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Standard Definition (640x480):</Typography>
                  <Typography variant="muted">
                    High quality thumbnail suitable for most use cases and guaranteed 
                    availability across all videos.
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">High Quality (480x360):</Typography>
                  <Typography variant="muted">
                    Good balance between file size and quality, widely supported 
                    and available for most videos.
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Medium Quality (320x180):</Typography>
                  <Typography variant="muted">
                    Compact size perfect for lists and smaller displays while 
                    maintaining reasonable image quality.
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-gray-500 rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Default (120x90):</Typography>
                  <Typography variant="muted">
                    Smallest thumbnail size, suitable for icons and minimal 
                    bandwidth situations. Always available.
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
                How to Optimize YouTube Video Metadata for Better Performance
              </CardTitle>
              <CardDescription>
                Learn best practices for YouTube SEO including title optimization, 
                description writing, and thumbnail design strategies.
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
                YouTube Thumbnail Design Guide: What Makes Thumbnails Click
              </CardTitle>
              <CardDescription>
                Comprehensive guide to creating compelling YouTube thumbnails 
                that increase click-through rates and engagement.
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
                YouTube Analytics: Understanding Video Performance Metrics
              </CardTitle>
              <CardDescription>
                Deep dive into YouTube analytics and how to use video metadata 
                to improve your content strategy and audience engagement.
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