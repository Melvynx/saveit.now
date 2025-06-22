import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Bookmark, CheckCircle, Heart, Video } from "lucide-react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col gap-16">
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary shadow-lg">
                <Image
                  src="/images/author.png"
                  alt="Creator of SaveIt"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <Badge className="mb-4">Creator & Daily User</Badge>
              <Typography variant="h1" className="mb-4">
                Built by a creator, for creators
              </Typography>
              <Typography variant="lead" className="mb-6">
                Hi! I'm the creator of SaveIt, and I'm a content creator who has
                published over 500 videos on YouTube.
              </Typography>

              <div className="space-y-6">
                <Typography className="text-lg">
                  To stay constantly informed and up-to-date in the fast-paced
                  digital world, I created this tool that allows me to find the
                  websites I need most in a simple and fast way.
                </Typography>

                <Typography className="text-lg">
                  This isn't just a side project for me—I personally have over
                  500 bookmarks saved in this application that I use daily. Your
                  data is as important to me as my own.
                </Typography>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center p-6">
              <CardContent className="p-0">
                <div className="mb-4">
                  <Video className="size-8 text-primary mx-auto mb-2" />
                  <Typography variant="h3" className="text-2xl font-bold">
                    500+
                  </Typography>
                </div>
                <Typography variant="muted">
                  YouTube Videos Published
                </Typography>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardContent className="p-0">
                <div className="mb-4">
                  <Bookmark className="size-8 text-primary mx-auto mb-2" />
                  <Typography variant="h3" className="text-2xl font-bold">
                    500+
                  </Typography>
                </div>
                <Typography variant="muted">
                  Personal Bookmarks Saved
                </Typography>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardContent className="p-0">
                <div className="mb-4">
                  <Heart className="size-8 text-primary mx-auto mb-2" />
                  <Typography variant="h3" className="text-2xl font-bold">
                    Daily
                  </Typography>
                </div>
                <Typography variant="muted">Active Usage</Typography>
              </CardContent>
            </Card>
          </div>

          {/* Commitment Section */}
          <div className="bg-muted/30 rounded-lg p-8">
            <div className="text-center mb-8">
              <Typography variant="h2" className="mb-4">
                My commitment to you
              </Typography>
              <Typography variant="lead" className="max-w-2xl mx-auto">
                As an independent creator who has been self-employed for several
                years, I work full-time on multiple projects. However, this
                project is particularly close to my heart.
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="size-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <Typography variant="large" className="font-medium mb-1">
                      Long-term maintenance guaranteed
                    </Typography>
                    <Typography variant="muted">
                      I use this app every single day with my 500+ bookmarks. If
                      it breaks, my workflow breaks—so you can be sure it will
                      be maintained.
                    </Typography>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="size-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <Typography variant="large" className="font-medium mb-1">
                      Continuous development
                    </Typography>
                    <Typography variant="muted">
                      As a content creator, I constantly discover new needs and
                      use cases. This drives continuous improvements to the
                      platform.
                    </Typography>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="size-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <Typography variant="large" className="font-medium mb-1">
                      Built from real needs
                    </Typography>
                    <Typography variant="muted">
                      Every feature comes from actual pain points I've
                      experienced as a content creator managing hundreds of
                      resources.
                    </Typography>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="size-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <Typography variant="large" className="font-medium mb-1">
                      Personal investment
                    </Typography>
                    <Typography variant="muted">
                      This isn't just business for me—it's the tool that powers
                      my daily work. Your success is directly tied to mine.
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Section */}
          <div className="text-center">
            <Typography variant="h2" className="mb-6">
              Why SaveIt exists
            </Typography>
            <div className="max-w-3xl mx-auto space-y-6">
              <Typography className="text-lg">
                As content creators, designers, entrepreneurs, and
                professionals, we visit thousands of websites and discover
                valuable resources that could be game-changers for our work. But
                traditional bookmarking systems fail us when we need to find
                that perfect article, tool, or resource we saved months ago.
              </Typography>

              <Typography className="text-lg">
                SaveIt was born from this frustration. I needed a way to not
                just save links, but to make them truly retrievable when
                inspiration strikes or when I'm solving a specific problem. The
                AI-powered search and automatic categorization mean you can find
                what you need, even when you can't remember exactly what you're
                looking for.
              </Typography>

              <Typography className="text-lg font-medium text-primary">
                This tool has transformed how I work, and I'm committed to
                making it do the same for you.
              </Typography>
            </div>
          </div>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}
