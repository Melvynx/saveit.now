import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { BookOpen, Mail, MessageCircle, Twitter } from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col gap-12">
          {/* Hero Section */}
          <div className="text-center">
            <div className="text-6xl mb-4">🤝</div>
            <Typography variant="h1" className="mb-4">
              We're here to help
            </Typography>
            <Typography variant="lead" className="max-w-2xl mx-auto">
              Don't worry, we've got you covered. Whether you need help getting
              started, troubleshooting an issue, or just want to chat about
              features, we're here for you.
            </Typography>
          </div>

          {/* Contact Methods */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
                  <BookOpen className="size-6 text-primary" />
                </div>
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  Find detailed guides and troubleshooting tips
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/docs">Browse Documentation</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
                  <Twitter className="size-6 text-primary" />
                </div>
                <CardTitle>Twitter</CardTitle>
                <CardDescription>
                  Quick questions and community support
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild variant="outline" className="w-full">
                  <a
                    href="https://twitter.com/melvynxdev"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @melvynxdev
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
                  <Mail className="size-6 text-primary" />
                </div>
                <CardTitle>Email Support</CardTitle>
                <CardDescription>
                  Professional support for detailed issues
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild variant="outline" className="w-full">
                  <a href="mailto:help@saveit.now">help@saveit.now</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Reassurance Section */}
          <div className="bg-muted/30 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">✨</div>
            <Typography variant="h3" className="mb-4">
              You're in good hands
            </Typography>
            <Typography variant="muted" className="max-w-2xl mx-auto">
              SaveIt.now is built with care and attention to detail. We're
              constantly working to improve your experience and make sure
              everything works smoothly. If something doesn't feel right, we
              want to know about it so we can fix it quickly.
            </Typography>
          </div>

          {/* Quick Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Typography variant="h3" className="mb-4 flex items-center gap-2">
                <MessageCircle className="size-5 text-primary" />
                Quick Tips
              </Typography>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <Typography variant="muted">
                    Try refreshing the page if something isn't loading properly
                  </Typography>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <Typography variant="muted">
                    Check your browser extensions if bookmarks aren't saving
                  </Typography>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <Typography variant="muted">
                    Use specific keywords in search for better results
                  </Typography>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <Typography variant="muted">
                    Clear your browser cache if you're seeing old content
                  </Typography>
                </li>
              </ul>
            </div>

            <div>
              <Typography variant="h3" className="mb-4">
                Response Times
              </Typography>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Typography variant="muted">Twitter</Typography>
                  <Typography
                    variant="small"
                    className="text-primary font-medium"
                  >
                    Usually within hours
                  </Typography>
                </div>
                <div className="flex justify-between items-center">
                  <Typography variant="muted">Email</Typography>
                  <Typography
                    variant="small"
                    className="text-primary font-medium"
                  >
                    Within 24 hours
                  </Typography>
                </div>
                <div className="flex justify-between items-center">
                  <Typography variant="muted">Documentation</Typography>
                  <Typography
                    variant="small"
                    className="text-primary font-medium"
                  >
                    Available 24/7
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}
