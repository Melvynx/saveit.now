/* eslint-disable @next/next/no-img-element */
import { PosthogLink } from "@/components/posthog-link";
import { ANALYTICS } from "@/lib/analytics";
import { Footer } from "@/features/page/footer";
import { MaxWidthContainer } from "@/features/page/page";
import { APP_LINKS } from "@/lib/app-links";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { CheckCircle, Download, Smartphone, Star } from "lucide-react";

export const metadata = {
  title: "SaveIt.now - iOS App | Save Anything, Anywhere",
  description:
    "The ultimate bookmark manager for iOS. Save links, images, and content from anywhere with AI-powered organization. Available on the App Store.",
  keywords:
    "iOS app, bookmark manager, save links, mobile bookmarks, iPhone app, iPad app, content organization, SaveIt.now",
  openGraph: {
    title: "SaveIt.now - iOS App | Save Anything, Anywhere",
    description:
      "The ultimate bookmark manager for iOS. Save links, images, and content from anywhere with AI-powered organization.",
    type: "website",
    images: [
      {
        url: "/images/ios/ios-app-1.png",
        width: 1200,
        height: 630,
        alt: "SaveIt.now iOS App Screenshots",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SaveIt.now - iOS App | Save Anything, Anywhere",
    description:
      "The ultimate bookmark manager for iOS. Save links, images, and content from anywhere with AI-powered organization.",
    images: ["/images/ios/ios-app-1.png"],
  },
};

export default function IOSPage() {
  const features = [
    {
      icon: <Smartphone className="size-5" />,
      title: "Native iOS Experience",
      description:
        "Built specifically for iOS with intuitive gestures and native performance",
    },
    {
      icon: <Star className="size-5" />,
      title: "AI-Powered Organization",
      description:
        "Automatically categorize and tag your saved content with intelligent AI",
    },
    {
      icon: <Download className="size-5" />,
      title: "Save from Anywhere",
      description:
        "Share extension lets you save content from any app on your device",
    },
  ];

  const screenshots = [
    {
      src: "/images/ios/ios-app-1.png",
      alt: "SaveIt.now iOS App - Main Dashboard",
    },
    {
      src: "/images/ios/ios-app-2.png",
      alt: "SaveIt.now iOS App - Save Content",
    },
    {
      src: "/images/ios/ios-app-3.png",
      alt: "SaveIt.now iOS App - Collections View",
    },
    {
      src: "/images/ios/ios-app-4.png",
      alt: "SaveIt.now iOS App - Search Feature",
    },
    {
      src: "/images/ios/ios-app-5.png",
      alt: "SaveIt.now iOS App - Content Details",
    },
    {
      src: "/images/ios/ios-app-6.png",
      alt: "SaveIt.now iOS App - Settings",
    },
  ];

  return (
    <div className="flex flex-col gap-12 w-full">
      <MaxWidthContainer className="space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src="/images/ios/icon.png"
                alt="SaveIt.now iOS App Icon"
                className="size-24 rounded-2xl shadow-lg"
              />
              <Badge
                variant="outline"
                className="absolute -top-2 -right-2 bg-background border-green-500 text-green-700"
              >
                New
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <Typography variant="h1" className="max-w-4xl mx-auto">
              SaveIt.now for iOS
            </Typography>
            <Typography
              variant="lead"
              className="max-w-3xl mx-auto text-muted-foreground"
            >
              The ultimate bookmark manager for your iPhone and iPad. Save
              anything, anywhere, with AI-powered organization that works
              seamlessly across all your devices.
            </Typography>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gap-2">
              <PosthogLink
                href={APP_LINKS.ios}
                event={ANALYTICS.IOS_DOWNLOAD}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="size-4" />
                Download on App Store
              </PosthogLink>
            </Button>
            <Button asChild variant="outline" size="lg">
              <PosthogLink href="/start">Try Web Version</PosthogLink>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Free to Download</Typography>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">Use the Share feature</Typography>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <Typography variant="muted">iOS only</Typography>
            </div>
          </div>
        </div>
      </MaxWidthContainer>
      {/* Screenshot Gallery */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <Typography variant="h2">Experience SaveIt.now on iOS</Typography>
          <Typography variant="muted" className="max-w-2xl mx-auto">
            See how SaveIt.now transforms the way you save and organize content
            on your iPhone and iPad
          </Typography>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {screenshots.map((screenshot, index) => (
            <div
              key={index}
              className="relative group cursor-pointer transform transition-all"
            >
              <div className="relative overflow-hidden">
                <img
                  src={screenshot.src}
                  alt={screenshot.alt}
                  className="w-full h-auto object-cover transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <MaxWidthContainer className="space-y-12">
        {/* Features Section */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <Typography variant="h2">Why Choose SaveIt.now for iOS?</Typography>
            <Typography variant="muted" className="max-w-2xl mx-auto">
              Built from the ground up for iOS, with features designed
              specifically for mobile productivity
            </Typography>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How to Get Started</CardTitle>
            <CardDescription>
              Start saving and organizing your content in minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  1
                </div>
                <Typography variant="small" className="font-semibold">
                  Download & Install
                </Typography>
                <Typography variant="muted" className="text-sm">
                  Get SaveIt.now from the App Store and sign in with your
                  account
                </Typography>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  2
                </div>
                <Typography variant="small" className="font-semibold">
                  Enable Share Extension
                </Typography>
                <Typography variant="muted" className="text-sm">
                  Add SaveIt.now to your share sheet for quick saving from any
                  app
                </Typography>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  3
                </div>
                <Typography variant="small" className="font-semibold">
                  Start Saving
                </Typography>
                <Typography variant="muted" className="text-sm">
                  Save links, images, and content from anywhere on your device
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </MaxWidthContainer>

      {/* SaveIt.now CTA Section */}
      <div className="py-24 sm:py-32">
        <MaxWidthContainer>
          <div className="relative isolate overflow-hidden bg-card border px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
            <Typography
              variant="h2"
              className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl"
            >
              Ready to Transform Your Mobile Productivity?
            </Typography>
            <Typography
              variant="lead"
              className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground"
            >
              Join thousands of users who have revolutionized how they save and organize content on iOS. Download SaveIt.now today and experience seamless content management on your iPhone and iPad.
            </Typography>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg">
                <PosthogLink
                  href={APP_LINKS.ios}
                  event={ANALYTICS.IOS_DOWNLOAD}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download SaveIt.now for iOS
                </PosthogLink>
              </Button>
              <PosthogLink
                href="/start"
                className="text-sm font-semibold text-foreground hover:text-foreground/80"
              >
                Try Web Version
                <span aria-hidden="true">→</span>
              </PosthogLink>
            </div>
            <svg
              viewBox="0 0 1024 1024"
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 -z-10 size-256 -translate-x-1/2 mask-[radial-gradient(closest-side,white,transparent)]"
            >
              <circle
                r={512}
                cx={512}
                cy={512}
                fill="url(#827591b1-ce8c-4110-b064-7cb85a0b1217)"
                fillOpacity="0.7"
              />
              <defs>
                <radialGradient id="827591b1-ce8c-4110-b064-7cb85a0b1217">
                  <stop stopColor="#7775D6" />
                  <stop offset={1} stopColor="#E935C1" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </MaxWidthContainer>
      </div>

      <Footer />
    </div>
  );
}
