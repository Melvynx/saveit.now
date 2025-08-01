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
  title: "Free SEO Tools for Marketers & Content Creators | SaveIt.now",
  description: "Professional-grade SEO tools to extract website data, analyze metadata, and optimize content. Used by 10,000+ marketers. Free forever, no registration required.",
  keywords: "free SEO tools, website analysis, og image extractor, meta tags analyzer, content extractor, favicon tools, youtube metadata, social media optimization, marketing tools",
  openGraph: {
    title: "Free SEO Tools for Marketers & Content Creators | SaveIt.now",
    description: "Professional-grade SEO tools to extract website data, analyze metadata, and optimize content. Used by 10,000+ marketers worldwide.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free SEO Tools for Marketers & Content Creators | SaveIt.now",
    description: "Professional-grade SEO tools for website analysis, content optimization, and social media research.",
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
            🚀 Professional SEO Tools
          </Badge>
          <Typography variant="h1" className="mb-6">
            Free Website Analysis Tools That Actually Work
          </Typography>
          <Typography variant="lead" className="mb-8 max-w-4xl mx-auto">
            Get professional-grade website insights in seconds. We built these tools for our own SaveIt.now system to extract everything about any website. 
            Now you can use them for free to analyze competitors, optimize content, and boost your SEO rankings.
          </Typography>
          <ul className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Used by 10,000+ Marketers</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Professional-Grade Results</Typography>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">No Registration Required</Typography>
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
          The Same Tools We Use to Power SaveIt.now
        </Typography>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Why These Tools Are Different</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                We didn't build these as side projects - they're the actual tools powering SaveIt.now's website analysis engine. 
                Every day, they help us extract metadata, analyze content, and optimize our own systems. 
                Now you get the same professional-grade tools, completely free.
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Built for Real Marketing Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <Typography variant="p">
                Stop wasting time with basic tools that give you incomplete data. Our comprehensive analysis extracts everything 
                - from hidden meta tags to social media optimization insights. Use these for competitor research, 
                content audits, and SEO optimization that actually moves the needle.
              </Typography>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get Professional Website Intelligence in Seconds</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-4">
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">1.</span>
                <div>
                  <Typography variant="small">Spy on Competitor Strategies:</Typography>
                  <Typography variant="muted">
                    See exactly how top-performing websites structure their metadata, social media optimization, and content hierarchy
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">2.</span>
                <div>
                  <Typography variant="small">Optimize for Maximum Visibility:</Typography>
                  <Typography variant="muted">
                    Preview and perfect how your content appears on Google, Twitter, LinkedIn, and Facebook before you publish
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">3.</span>
                <div>
                  <Typography variant="small">Find Hidden SEO Opportunities:</Typography>
                  <Typography variant="muted">
                    Uncover technical SEO elements, missing meta tags, and content gaps that your competitors might be missing
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">4.</span>
                <div>
                  <Typography variant="small">Research Smarter, Not Harder:</Typography>
                  <Typography variant="muted">
                    Get comprehensive website analysis in one click, then organize your findings with SaveIt.now for team collaboration
                  </Typography>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why These Tools Beat The Competition</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Battle-Tested Technology:</Typography>
                  <Typography variant="muted">
                    The same extraction engine that powers SaveIt.now's bookmark analysis for thousands of users daily
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Complete Data Privacy:</Typography>
                  <Typography variant="muted">
                    Zero data retention. We analyze and return results without storing anything about your research
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Actually Free Forever:</Typography>
                  <Typography variant="muted">
                    No freemium tricks or usage limits. We give you the full professional experience at zero cost
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Built by Marketing Engineers:</Typography>
                  <Typography variant="muted">
                    Created by the team who built SaveIt.now - we understand both technical SEO and real marketing needs
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Zero Friction Access:</Typography>
                  <Typography variant="muted">
                    Start analyzing websites immediately - no signup, no email verification, no credit card required
                  </Typography>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <div>
                  <Typography variant="small">Enterprise-Level Analysis:</Typography>
                  <Typography variant="muted">
                    Extract hidden metadata, analyze technical SEO, and get insights that basic tools completely miss
                  </Typography>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </MaxWidthContainer>

      {/* SaveIt.now CTA Section */}
      <SaveItCTA 
        title="Great Tools for Analysis → But Where Do You Save Your Findings?"
        description="You just discovered how to extract powerful website insights. Now organize all your research, competitor analysis, and SEO findings in one place with SaveIt.now. Never lose track of your discoveries again."
        primaryButtonText="Start Organizing Your Research"
        primaryButtonHref="/"
        secondaryButtonText="Continue using tools"
        secondaryButtonHref="/tools"
      />

      <Footer />
    </div>
  );
}