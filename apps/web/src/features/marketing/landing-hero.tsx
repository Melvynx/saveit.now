/* eslint-disable @next/next/no-img-element */
"use client";

import { PosthogLink } from "@/components/posthog-link";
import { ANALYTICS } from "@/lib/analytics";
import { APP_LINKS } from "@/lib/app-links";
import { Button } from "@workspace/ui/components/button";
import { Check, Search } from "lucide-react";
import Link from "next/link";
import { SignInWith } from "../auth/sign-in-with";

export const LandingHero = () => {
  return (
    <div className="bg-background dark:bg-background">
      <div className="relative isolate pt-14">
        <div className="py-24 sm:py-32 lg:pb-40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-5xl font-semibold text-balance text-foreground sm:text-7xl leading-tight sm:leading-[1.2]">
                Organize nothing.
                <br className="mb-4 sm:mb-6" />
                <b className="bg-primary/10 border-primary text-primary -mx-2 rounded-lg inline-flex gap-2 items-center border px-2">
                  <Search className="size-12" /> Find everything.
                </b>
              </h1>
              <p className="mt-8 text-lg font-medium text-pretty text-muted-foreground sm:text-xl/8">
                Save it now—find it in seconds, whether it's an article, video,
                post, or tool. AI-powered search that actually understands what
                you're looking for.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6 flex-col sm:flex-row gap-y-4">
                <SignInWith
                  buttonProps={{ size: "lg", variant: "default" }}
                  type="google"
                />
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="sm:flex-1 max-lg:py-2 w-full sm:w-auto"
                >
                  <Link href={APP_LINKS.signin}>Sign in</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    No credit card required
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    24/7 Support
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    Free plan
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-16 flow-root sm:mt-24">
              <div className="-m-2 rounded-xl bg-muted/50 p-2 ring-1 ring-border lg:-m-4 lg:rounded-2xl lg:p-4">
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
                  />
                </div>
              </div>
            </div>

            {/* Features section inline */}
            <div className="mt-16 sm:mt-20">
              <div className="mx-auto max-w-4xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <span className="text-4xl">🤖</span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      AI summaries
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Get the key takeaways of articles and videos without
                      reopening them.
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <span className="text-4xl">🔍</span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Advanced AI Search
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Type an idea; and our AI will always find the most
                      relevant, guaranteed.
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <span className="text-4xl">🖼️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Visual previews
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Thumbnails and screenshots help you spot what you need at
                      a glance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform compatibility */}
            <div className="mt-12 flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-4">Work with</p>
              <div className="flex flex-wrap justify-center gap-6">
                <Link
                  href={APP_LINKS.chrome}
                  target="_blank"
                  className="flex items-center gap-2 hover:underline text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <img
                    alt="chrome-extensions"
                    src="https://svgl.app/library/chrome.svg"
                    className="size-4"
                  />
                  <span>Chrome</span>
                </Link>
                <Link
                  href={APP_LINKS.firefox}
                  target="_blank"
                  className="flex items-center gap-2 hover:underline text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <img
                    alt="firefox-extensions"
                    src="https://svgl.app/library/firefox.svg"
                    className="size-4"
                  />
                  <span>Firefox</span>
                </Link>
                <PosthogLink
                  href={APP_LINKS.ios}
                  event={ANALYTICS.IOS_DOWNLOAD}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:underline text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <img
                    alt="ios-icon"
                    src="https://svgl.app/library/apple_dark.svg"
                    className="size-4 fill-white"
                  />
                  <span>iOS</span>
                </PosthogLink>
              </div>
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-gradient-to-tr from-primary/30 to-accent/30 opacity-30 sm:left-[calc(50%+36rem)] sm:w-288.75 dark:opacity-20"
          />
        </div>
      </div>
    </div>
  );
};
