/* eslint-disable @next/next/no-img-element */
"use client";

import { PosthogLink } from "@/components/posthog-link";
import { ANALYTICS } from "@/lib/analytics";
import { APP_LINKS } from "@/lib/app-links";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { Check } from "lucide-react";
import Link from "next/link";
import { SignInWith } from "../auth/sign-in-with";
import { MaxWidthContainer } from "../page/page";

export const LandingHero = () => {
  return (
    <div
      style={{
        // @ts-expect-error Doesn't care
        "--box-color": "color-mix(in srgb, var(--border) 30%, transparent)",
        // "min-height": "min(800px, 100dvh)",
      }}
      className="bg-background flex-1 flex flex-col bg-opacity-80 [background-image:linear-gradient(var(--box-color)_1px,transparent_1px),linear-gradient(to_right,var(--box-color)_1px,transparent_1px)] [background-size:20px_20px] border-b border-border/30"
    >
      <MaxWidthContainer
        width="lg"
        className="w-full my-12 lg:my-24 flex flex-col lg:flex-row gap-8 lg:gap-12"
      >
        <div className="lg:ml-auto flex flex-1 flex-col gap-6">
          <Badge variant="outline">Bookmarking System</Badge>
          <Typography variant="h1" className="font-bold">
            Organize nothing. Find everything.
          </Typography>
          <Typography variant="lead">
            Save it now—find it in seconds, whether it’s an article, video,
            post, or tool.
          </Typography>
          <ul className="flex flex-col gap-4">
            <li className="flex items-start gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <Typography variant="large" className="font-medium">
                  AI summaries
                </Typography>
                <Typography variant="muted">
                  Get the key takeaways of articles and videos without reopening
                  them.
                </Typography>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lg">🔍</span>
              <div>
                <Typography variant="large" className="font-medium">
                  Advanced AI Search
                </Typography>
                <Typography variant="muted">
                  Type an idea; and our AI will always find the most relevant,
                  guaranted.
                </Typography>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lg">🖼️</span>
              <div>
                <Typography variant="large" className="font-medium">
                  Visual previews
                </Typography>
                <Typography variant="muted">
                  Thumbnails and screenshots help you spot what you need at a
                  glance.
                </Typography>
              </div>
            </li>
          </ul>
          <div className="flex items-center flex-col lg:flex-row gap-2">
            <SignInWith buttonProps={{ size: "lg" }} type="google" />
            <Button
              asChild
              size="lg"
              variant="outline"
              className="flex-1 max-lg:py-2 w-full"
            >
              <Link href={APP_LINKS.signin}>Sign in</Link>
            </Button>
          </div>
          <div className="flex flex-row gap-3">
            <div className="flex items-center gap-1">
              <Check className="size-4 text-green-500" />
              <Typography variant="muted">No credit card required</Typography>
            </div>
            <div className="flex items-center gap-1">
              <Check className="size-4 text-green-500" />
              <Typography variant="muted">24/7 Support</Typography>
            </div>
            <div className="flex items-center gap-1">
              <Check className="size-4 text-green-500" />
              <Typography variant="muted">Free plan</Typography>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Typography variant="muted">Work with</Typography>
            <div className="flex flex-row gap-4">
              <Typography
                as={Link}
                href={APP_LINKS.chrome}
                variant="small"
                target="_blank"
                className="flex items-center gap-2 hover:underline"
              >
                <img
                  alt="chrome-extensions"
                  src="https://svgl.app/library/chrome.svg"
                  className="size-4"
                />
                <Typography>Chrome</Typography>
              </Typography>
              <Typography
                as={Link}
                href={APP_LINKS.firefox}
                variant="small"
                target="_blank"
                className="flex items-center gap-2 hover:underline"
              >
                <img
                  alt="chrome-extensions"
                  src="https://svgl.app/library/firefox.svg"
                  className="size-4"
                />
                <Typography>Firefox</Typography>
              </Typography>
              <PosthogLink
                href={APP_LINKS.ios}
                event={ANALYTICS.IOS_DOWNLOAD}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:underline text-sm text-muted-foreground"
              >
                <img
                  alt="ios-icon"
                  src="https://svgl.app/library/apple_dark.svg"
                  className="size-4 fill-white"
                />
                <Typography>iOS</Typography>
              </PosthogLink>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: "0",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <iframe
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "0",
              }}
              src="https://www.tella.tv/video/cmdfelaz300170bjr8yymdxsy/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </MaxWidthContainer>
    </div>
  );
};
