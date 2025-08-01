import { SaveItCTA } from "@/components/tools/saveit-cta";
import { ToolCard } from "@/components/tools/tool-card";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Free SEO Tools & Web Utilities | SaveIt.now Tools",
  description: "Collection of free SEO tools and web utilities including OG image extractor, metadata analyzer, content extractor, favicon tools, and YouTube metadata tools. No registration required.",
  keywords: "free SEO tools, web utilities, og image extractor, meta tags, content extractor, favicon extractor, youtube metadata, social media tools, website analysis",
  openGraph: {
    title: "Free SEO Tools & Web Utilities | SaveIt.now Tools",
    description: "Powerful collection of free SEO tools including OG image extractor, metadata analyzer, content extractor, and more. No registration required.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free SEO Tools & Web Utilities | SaveIt.now Tools",
    description: "Free SEO tools for content extraction, metadata analysis, and social media optimization.",
  },
};

export default function ToolsPage() {
  const tools = [
    {
      title: "OG Image & Twitter Card Extractor",
      description: "Extract Open Graph images, Twitter cards, and social media meta tags from any URL instantly.",
      href: "/tools/og-images",
      icon: "🖼️",
      features: ["Open Graph extraction", "Twitter card preview", "Social media optimization", "Meta tag analysis"],
      popular: true,
    },
    {
      title: "Extract Website Metadata",
      description: "Comprehensive analysis of all meta tags including SEO, social media, and technical metadata from any URL.",
      href: "/tools/extract-metadata",
      icon: "🏷️",
      features: ["Complete meta tag analysis", "SEO tag extraction", "Social media tags", "Technical metadata"],
    },
    {
      title: "Extract Website Content",
      description: "Extract and analyze the main content from any webpage, including text, headings, and structure.",
      href: "/tools/extract-content",
      icon: "📄",
      features: ["Main content extraction", "Text analysis", "Heading structure", "Content optimization"],
    },
    {
      title: "Extract Website Favicons",
      description: "Extract and download favicons from any website in multiple sizes and formats with quality analysis.",
      href: "/tools/extract-favicons",
      icon: "⭐",
      features: ["Multiple favicon sizes", "Various formats (ICO, PNG)", "Quality analysis", "Instant download"],
    },
    {
      title: "YouTube Metadata Extractor",
      description: "Extract comprehensive metadata from YouTube videos including title, description, thumbnails, and analytics.",
      href: "/tools/youtube-metadata",
      icon: "🎥",
      features: ["Video metadata", "Thumbnail extraction", "Channel information", "SEO optimization"],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div
        style={{
          // @ts-expect-error CSS custom property
          "--box-color": "color-mix(in srgb, var(--border) 30%, transparent)",
        }}
        className="bg-background flex-1 flex flex-col bg-opacity-80 [background-image:linear-gradient(var(--box-color)_1px,transparent_1px),linear-gradient(to_right,var(--box-color)_1px,transparent_1px)] [background-size:20px_20px] border-b border-border/30"
      >
        <MaxWidthContainer width="lg" className="text-center py-16">
          <Badge variant="outline" className="mb-6">
            🛠️ SEO Tools & Utilities
          </Badge>
          <Typography variant="h1" className="mb-6">
            Free SEO Tools & Web Utilities
          </Typography>
          <Typography variant="lead" className="mb-8 max-w-4xl mx-auto">
            Powerful, free tools to analyze, optimize, and enhance your web presence. 
            Extract metadata, analyze content, optimize images, and boost your SEO with our comprehensive toolkit.
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
      </div>

      {/* Tools Grid */}
      <MaxWidthContainer width="lg" className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool, index) => (
            <ToolCard
              key={index}
              title={tool.title}
              description={tool.description}
              href={tool.href}
              icon={tool.icon}
              features={tool.features}
              popular={tool.popular}
            />
          ))}
        </div>
      </MaxWidthContainer>

      {/* SEO Content Section */}
      <MaxWidthContainer spacing="sm" className="flex flex-col gap-8 lg:gap-12">
        <Typography variant="h2" className="">
          Everything You Need for Website Analysis & SEO
        </Typography>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Why Use Our Free SEO Tools?</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Our comprehensive suite of SEO tools helps you analyze, optimize, and enhance your web presence. 
                From extracting Open Graph images to analyzing metadata and content structure, 
                our tools provide the insights you need to improve your website's performance and social media presence.
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Built for SEO Professionals & Marketers</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Whether you're an SEO expert, digital marketer, or website owner, our tools are designed to save you time 
                and provide accurate insights. All tools are completely free, require no registration, and respect your privacy 
                by not storing any of your data.
              </Typography>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How Our SEO Tools Help Your Business</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-4">
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">1.</span>
                <div>
                  <Typography variant="small">Analyze Competitor Content:</Typography>
                  <Typography variant="muted">
                    Extract and analyze metadata, content structure, and social media optimization from any website
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">2.</span>
                <div>
                  <Typography variant="small">Optimize Social Media Presence:</Typography>
                  <Typography variant="muted">
                    Preview how your content appears on social platforms and optimize for maximum engagement
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">3.</span>
                <div>
                  <Typography variant="small">Improve SEO Performance:</Typography>
                  <Typography variant="muted">
                    Analyze technical SEO elements, meta tags, and content structure to boost search rankings
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">4.</span>
                <div>
                  <Typography variant="small">Save Time on Research:</Typography>
                  <Typography variant="muted">
                    Get instant insights without manual inspection, then save findings with SaveIt.now for future reference  
                  </Typography>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why Choose Our Free SEO Tools?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Fast & Reliable:</Typography>
                  <Typography variant="muted">
                    Get instant results with our optimized tools built for speed and accuracy
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Privacy First:</Typography>
                  <Typography variant="muted">
                    We don't store your data. All analysis happens in real-time without logging
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Always Free:</Typography>
                  <Typography variant="muted">
                    No hidden costs, no premium tiers. Full access to all features, forever
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">SEO Focused:</Typography>
                  <Typography variant="muted">
                    Tools designed by SEO experts to solve real optimization challenges
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">No Registration Required:</Typography>
                  <Typography variant="muted">
                    Start using any tool immediately without signing up or providing personal information
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Comprehensive Analysis:</Typography>
                  <Typography variant="muted">
                    Extract everything from metadata and content to favicons and social media previews
                  </Typography>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </MaxWidthContainer>

      {/* SaveIt.now CTA Section */}
      <SaveItCTA 
        title="Save and Organize Your SEO Research"
        description="Use our tools to analyze websites and social media optimization, then save your findings with SaveIt.now for easy reference and team collaboration."
        primaryButtonText="Try SaveIt.now Free"
        primaryButtonHref="/"
        secondaryButtonText="View all tools"
        secondaryButtonHref="/tools"
      />

      <Footer />
    </div>
  );
}