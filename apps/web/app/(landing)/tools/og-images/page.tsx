import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import Link from "next/link";
import { OGImageTool } from "./og-image-tool";

export const metadata = {
  title: "Free OG Image & Twitter Card Extractor | Open Graph Meta Tags Tool",
  description: "Extract Open Graph images, Twitter cards, and social media meta tags from any URL. Free online tool to preview how your links appear on social media platforms.",
  keywords: "og image extractor, twitter card, open graph, meta tags, social media preview, facebook preview, linkedin preview, free SEO tool",
  openGraph: {
    title: "Free OG Image & Twitter Card Extractor Tool",
    description: "Extract and preview Open Graph images and Twitter cards from any URL instantly. Perfect for social media optimization and SEO.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free OG Image & Twitter Card Extractor Tool",
    description: "Extract Open Graph images and Twitter cards from any URL. Free online tool for social media optimization.",
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
          <Badge variant="outline" className="mb-6">🖼️ OG Image Extractor</Badge>
          <Typography variant="h1" className="mb-6">
            Free OG Image & Twitter Card Extractor
          </Typography>
          <Typography variant="lead" className="mb-8 max-w-4xl mx-auto">
            Extract Open Graph images, Twitter cards, and social media meta tags from any URL instantly. 
            Preview how your links will appear on Facebook, Twitter, LinkedIn, and other social platforms.
          </Typography>
          <ul className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <Typography variant="muted">Free Forever</Typography>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <Typography variant="muted">No Registration Required</Typography>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <Typography variant="muted">Instant Results</Typography>
            </li>
          </ul>
        </MaxWidthContainer>
      </div>

      {/* Tool Section */}
      <MaxWidthContainer className="py-12">
        <OGImageTool />
      </MaxWidthContainer>

      {/* SEO Content Section */}
      <div className="bg-muted/30">
        <MaxWidthContainer className="py-16">
          <Typography variant="h2" className="text-center mb-12">
            Everything You Need to Know About Open Graph Images
          </Typography>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>What are Open Graph Images?</CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="p">
                  Open Graph images are the preview images that appear when you share a link on social media platforms like 
                  Facebook, Twitter, LinkedIn, and WhatsApp. These meta tags were created by Facebook to standardize how 
                  content appears when shared across social networks.
                </Typography>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Why Are OG Images Important?</CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="p">
                  OG images significantly impact click-through rates and engagement on social media. Posts with compelling 
                  images receive 2.3x more engagement than those without. They help create a professional appearance and 
                  improve your content's visibility in social feeds.
                </Typography>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-none">
            <Typography variant="h3" className="mb-6">
              How to Use Our OG Image Extractor Tool
            </Typography>
            
            <Card className="mb-8">
              <CardContent className="pt-6">
                <ol className="list-decimal list-inside space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="font-semibold text-primary">1.</span>
                    <div>
                      <Typography variant="large" className="font-medium">Enter the URL:</Typography>
                      <Typography variant="muted">Paste any website URL into the input field above</Typography>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-semibold text-primary">2.</span>
                    <div>
                      <Typography variant="large" className="font-medium">Click Extract:</Typography>
                      <Typography variant="muted">Our tool will fetch and analyze all meta tags from the webpage</Typography>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-semibold text-primary">3.</span>
                    <div>
                      <Typography variant="large" className="font-medium">View Results:</Typography>
                      <Typography variant="muted">See the Open Graph image, Twitter card, and all social media metadata</Typography>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-semibold text-primary">4.</span>
                    <div>
                      <Typography variant="large" className="font-medium">Preview Social Shares:</Typography>
                      <Typography variant="muted">Understand exactly how your link will appear on different platforms</Typography>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Typography variant="h3" className="mb-6">
              Supported Meta Tags and Social Platforms
            </Typography>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Open Graph Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">og:image</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">og:title</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">og:description</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">og:type</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">og:site_name</Typography>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Twitter Cards</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">twitter:image</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">twitter:card</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">twitter:title</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">twitter:description</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <Typography variant="muted">twitter:site</Typography>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Platforms</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      <Typography variant="muted">Facebook</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      <Typography variant="muted">Twitter/X</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      <Typography variant="muted">LinkedIn</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      <Typography variant="muted">WhatsApp</Typography>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      <Typography variant="muted">Slack</Typography>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Typography variant="h3" className="mb-6">
              Best Practices for Open Graph Images
            </Typography>
            
            <Card className="bg-primary/5 border-primary/20 mb-8">
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                    <div>
                      <Typography variant="large" className="font-medium">Optimal Size:</Typography>
                      <Typography variant="muted">Use 1200x630 pixels for the best compatibility across all platforms</Typography>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                    <div>
                      <Typography variant="large" className="font-medium">File Format:</Typography>
                      <Typography variant="muted">PNG or JPG formats work best, keep file size under 8MB</Typography>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                    <div>
                      <Typography variant="large" className="font-medium">Text Overlay:</Typography>
                      <Typography variant="muted">If using text, make it large and readable on mobile devices</Typography>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                    <div>
                      <Typography variant="large" className="font-medium">Brand Consistency:</Typography>
                      <Typography variant="muted">Include your logo or brand colors for recognition</Typography>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                    <div>
                      <Typography variant="large" className="font-medium">High Quality:</Typography>
                      <Typography variant="muted">Use high-resolution images that look good at different sizes</Typography>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                    <div>
                      <Typography variant="large" className="font-medium">Avoid Small Text:</Typography>
                      <Typography variant="muted">Text smaller than 20px may not be readable in previews</Typography>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </MaxWidthContainer>
      </div>

      {/* SaveIt.now Advertisement */}
      <div className="bg-gradient-to-r from-primary to-purple-600 text-white">
        <MaxWidthContainer className="py-16 text-center">
          <Typography variant="h2" className="mb-6 text-white">
            Save and Organize Your Favorite Content with SaveIt.now
          </Typography>
          <Typography variant="lead" className="mb-8 text-primary-foreground/80 max-w-4xl mx-auto">
            Beyond extracting OG images, SaveIt.now helps you bookmark, organize, and rediscover web content. 
            Save articles, videos, tweets, and more with AI-powered tagging and search.
          </Typography>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 rounded-lg p-6">
              <Typography variant="large" className="font-semibold mb-2 text-white">🤖 AI-Powered</Typography>
              <Typography variant="muted" className="text-primary-foreground/70">Automatic tagging and content analysis</Typography>
            </div>
            <div className="bg-white/10 rounded-lg p-6">
              <Typography variant="large" className="font-semibold mb-2 text-white">🔍 Smart Search</Typography>
              <Typography variant="muted" className="text-primary-foreground/70">Find any bookmark instantly with advanced search</Typography>
            </div>
            <div className="bg-white/10 rounded-lg p-6">
              <Typography variant="large" className="font-semibold mb-2 text-white">📱 Browser Extension</Typography>
              <Typography variant="muted" className="text-primary-foreground/70">Save content with one click from any website</Typography>
            </div>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link href="/">
              Try SaveIt.now Free →
            </Link>
          </Button>
        </MaxWidthContainer>
      </div>

      {/* Related Articles */}
      <MaxWidthContainer className="py-16">
        <Typography variant="h2" className="text-center mb-12">
          Related SEO and Social Media Articles
        </Typography>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                How to Optimize Open Graph Images for Social Media
              </CardTitle>
              <CardDescription>
                Learn the best practices for creating compelling OG images that drive engagement and clicks on social platforms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Typography variant="link" className="text-sm font-medium">Read more →</Typography>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                Twitter Card Types and When to Use Them
              </CardTitle>
              <CardDescription>
                Understanding the different Twitter card types and how to choose the right one for your content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Typography variant="link" className="text-sm font-medium">Read more →</Typography>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                Meta Tags That Actually Matter for SEO
              </CardTitle>
              <CardDescription>
                A comprehensive guide to the most important meta tags for search engine optimization and social sharing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Typography variant="link" className="text-sm font-medium">Read more →</Typography>
            </CardContent>
          </Card>
        </div>
      </MaxWidthContainer>

      <Footer />
    </div>
  );
}