import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, CheckCircle, Heart, Video } from "lucide-react";

import { LandingHeader } from "@/features/marketing/landing/header";
import { LandingReveal } from "@/features/marketing/landing/reveal";
import {
  LANDING_HEAD_LINKS,
  LandingStyle,
} from "@/features/marketing/landing/theme";
import { Footer } from "@/features/page/footer";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";

export const Route = createFileRoute("/about")({
  head: () => ({
    links: LANDING_HEAD_LINKS,
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="landing-page landing-dusk dark bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <LandingHeader />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-24 sm:pt-28">
        <div className="flex flex-col gap-16 sm:gap-24">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-[#ff8f70]/40 shadow-2xl shadow-black/50">
                <img
                  src="/images/author.png"
                  alt="Creator of SaveIt"
                  className="size-full object-cover"
                />
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <LandingReveal>
                <Badge className="mb-4 border-[#ff8f70]/20 bg-[#ff8f70]/10 text-[#ff8f70]">
                  Creator & Daily User
                </Badge>
                <h1 className="landing-display mb-4 text-balance text-4xl tracking-tight text-[#f7ede8] sm:text-5xl">
                  Built by a <em className="landing-gradient-text">creator</em>,
                  for creators
                </h1>
                <Typography variant="lead" className="mb-6">
                  Hi! I'm the creator of SaveIt, and I'm a content creator who
                  has published over 500 videos on YouTube.
                </Typography>
              </LandingReveal>

              <div className="space-y-6">
                <Typography className="text-lg text-[#a89099]">
                  To stay constantly informed and up-to-date in the fast-paced
                  digital world, I created this tool that allows me to find the
                  websites I need most in a simple and fast way.
                </Typography>
                <Typography className="text-lg text-[#a89099]">
                  This is not just a side project for me. I personally have over
                  500 bookmarks saved in this application that I use daily. Your
                  data is as important to me as my own.
                </Typography>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              [Video, "500+", "YouTube Videos Published"],
              [Bookmark, "500+", "Personal Bookmarks Saved"],
              [Heart, "Daily", "Active Usage"],
            ].map(([Icon, value, label]) => {
              const TypedIcon = Icon as typeof Video;
              return (
                <Card
                  key={String(label)}
                  className="rounded-2xl border-white/[0.08] bg-white/[0.03] text-center p-6 shadow-none"
                >
                  <CardContent className="p-0">
                    <div className="mb-4">
                      <TypedIcon className="size-8 text-[#ff8f70] mx-auto mb-2" />
                      <Typography
                        variant="h3"
                        className="landing-display text-3xl text-[#f7ede8]"
                      >
                        {value as string}
                      </Typography>
                    </div>
                    <Typography variant="muted">{label as string}</Typography>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-8 sm:p-10">
            <div className="text-center mb-8">
              <h2 className="landing-display mb-4 text-3xl tracking-tight text-[#f7ede8] sm:text-4xl">
                My commitment to you
              </h2>
              <Typography variant="lead" className="max-w-2xl mx-auto">
                As an independent creator who has been self-employed for several
                years, I work full-time on multiple projects. However, this
                project is particularly close to my heart.
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                [
                  "Long-term maintenance guaranteed",
                  "I use this app every single day with my 500+ bookmarks. If it breaks, my workflow breaks, so you can be sure it will be maintained.",
                ],
                [
                  "Continuous development",
                  "As a content creator, I constantly discover new needs and use cases. This drives continuous improvements to the platform.",
                ],
                [
                  "Built from real needs",
                  "Every feature comes from actual pain points I have experienced as a content creator managing hundreds of resources.",
                ],
                [
                  "Personal investment",
                  "This is not just business for me. It is the tool that powers my daily work. Your success is directly tied to mine.",
                ],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3">
                  <CheckCircle className="size-5 text-[#ff8f70] mt-1 flex-shrink-0" />
                  <div>
                    <Typography
                      variant="large"
                      className="font-medium mb-1 text-[#f7ede8]"
                    >
                      {title}
                    </Typography>
                    <Typography variant="muted">{body}</Typography>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <h2 className="landing-display mb-6 text-3xl tracking-tight text-[#f7ede8] sm:text-4xl">
              Why <em className="landing-gradient-text">SaveIt</em> exists
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <Typography className="text-lg text-[#a89099]">
                As content creators, designers, entrepreneurs, and
                professionals, we visit thousands of websites and discover
                valuable resources that could be game-changers for our work. But
                traditional bookmarking systems fail us when we need to find
                that perfect article, tool, or resource we saved months ago.
              </Typography>
              <Typography className="text-lg text-[#a89099]">
                SaveIt was born from this frustration. I needed a way to not
                just save links, but to make them truly retrievable when
                inspiration strikes or when I am solving a specific problem.
              </Typography>
              <Typography className="text-lg font-medium text-[#ff8f70]">
                This tool has transformed how I work, and I am committed to
                making it do the same for you.
              </Typography>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
