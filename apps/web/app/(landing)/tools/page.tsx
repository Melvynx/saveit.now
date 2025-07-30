import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import Link from "next/link";

export const metadata = {
  title: "Free SEO Tools & Web Utilities | SaveIt.now Tools",
  description: "Collection of free SEO tools and web utilities including OG image extractor, meta tag analyzer, and social media preview tools. No registration required.",
  keywords: "free SEO tools, web utilities, og image extractor, meta tags, social media tools, website analysis",
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
    // Placeholder for future tools
    {
      title: "Meta Tag Analyzer",
      description: "Comprehensive analysis of all meta tags including SEO, social media, and technical tags.",
      href: "#",
      icon: "🏷️",
      features: ["SEO meta tags", "Social tags", "Technical analysis", "Recommendations"],
      comingSoon: true,
    },
    {
      title: "Favicon Extractor",
      description: "Extract and download favicons from any website in multiple sizes and formats.",
      href: "#",
      icon: "⭐",
      features: ["Multiple sizes", "Various formats", "Instant download", "Quality analysis"],
      comingSoon: true,
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
          <Badge variant="outline" className="mb-6">SEO Tools & Utilities</Badge>
          <Typography variant="h1" className="mb-6">
            Free SEO Tools & Web Utilities
          </Typography>
          <Typography variant="lead" className="mb-8 max-w-3xl mx-auto">
            Powerful, free tools to analyze, optimize, and enhance your web presence. 
            No registration required, instant results, completely free forever.
          </Typography>
          <ul className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <Typography variant="muted">100% Free</Typography>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <Typography variant="muted">No Sign-up</Typography>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <Typography variant="muted">Privacy Focused</Typography>
            </li>
          </ul>
        </MaxWidthContainer>
      </div>

      {/* Tools Grid */}
      <MaxWidthContainer width="lg" className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool, index) => (
            <Card key={index} className={`transition-all hover:shadow-md relative ${
              tool.popular ? "border-primary" : ""
            }`}>
              {tool.popular && (
                <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{tool.icon}</span>
                  <div className="flex-1">
                    <CardTitle className="mb-2">{tool.title}</CardTitle>
                    {tool.comingSoon && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="leading-relaxed">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <Typography variant="small" className="font-semibold">Features:</Typography>
                  <ul className="space-y-2">
                    {tool.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <Typography variant="muted" className="text-sm">{feature}</Typography>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              
              <CardFooter>
                {tool.comingSoon ? (
                  <Button disabled className="w-full" variant="outline">
                    Coming Soon
                  </Button>
                ) : (
                  <Button asChild className="w-full">
                    <Link href={tool.href}>
                      Use Tool →
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </MaxWidthContainer>

      {/* Why Choose Our Tools */}
      <div className="bg-muted/30">
        <MaxWidthContainer className="py-16">
          <Typography variant="h2" className="text-center mb-12">
            Why Choose Our Free SEO Tools?
          </Typography>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <Typography variant="large" className="mb-2">Fast & Reliable</Typography>
              <Typography variant="muted">
                Get instant results with our optimized tools built for speed and accuracy.
              </Typography>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <Typography variant="large" className="mb-2">Privacy First</Typography>
              <Typography variant="muted">
                We don't store your data. All analysis happens in real-time without logging.
              </Typography>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💎</span>
              </div>
              <Typography variant="large" className="mb-2">Always Free</Typography>
              <Typography variant="muted">
                No hidden costs, no premium tiers. Full access to all features, forever.
              </Typography>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <Typography variant="large" className="mb-2">SEO Focused</Typography>
              <Typography variant="muted">
                Tools designed by SEO experts to solve real optimization challenges.
              </Typography>
            </div>
          </div>
        </MaxWidthContainer>
      </div>

      {/* SaveIt.now Integration */}
      <div className="bg-gradient-to-r from-primary to-purple-600 text-white">
        <MaxWidthContainer className="py-16 text-center">
          <Typography variant="h2" className="mb-6 text-white">
            Save and Organize Your SEO Research
          </Typography>
          <Typography variant="lead" className="mb-8 text-primary-foreground/80 max-w-3xl mx-auto">
            Use our tools to analyze websites and social media optimization, then save your findings 
            with SaveIt.now for easy reference and team collaboration.
          </Typography>
          <Button asChild size="lg" variant="secondary">
            <Link href="/">
              Try SaveIt.now Free →
            </Link>
          </Button>
        </MaxWidthContainer>
      </div>

      <Footer />
    </div>
  );
}