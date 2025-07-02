import { APP_LINKS } from "@/lib/app-links";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import Link from "next/link";
import { MaxWidthContainer } from "../page/page";
import { BookmarkInputLanding } from "./bookmark-input-landing";

export const LandingHero = () => {
  return (
    <div
      style={{
        // @ts-expect-error Doesn't care
        "--box-color": "color-mix(in srgb, var(--border) 30%, transparent)",
        "min-height": "min(800px, 100dvh)",
      }}
      className="bg-background flex-1 flex flex-col bg-opacity-80 [background-image:linear-gradient(var(--box-color)_1px,transparent_1px),linear-gradient(to_right,var(--box-color)_1px,transparent_1px)] [background-size:20px_20px] border-b border-border/30"
    >
      <MaxWidthContainer className="w-full my-12 lg:my-24 flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="ml-auto flex flex-1 flex-col gap-6">
          <Badge>Beta</Badge>
          <Typography variant="h2" className="font-bold">
            Organize nothing. Find everything.
          </Typography>
          <Typography variant="lead">
            Save it now—find it in seconds, whether it’s an article, video,
            post, or tool.
          </Typography>
          <ul className="flex flex-col gap-4">
            <li className="flex items-start gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <Typography variant="large" className="font-medium">
                  Instant capture
                </Typography>
                <Typography variant="muted">
                  Paste any URL and it's safely stored—no friction.
                </Typography>
              </div>
            </li>
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
              <span className="text-lg">🏷️</span>
              <div>
                <Typography variant="large" className="font-medium">
                  Auto-tagging
                </Typography>
                <Typography variant="muted">
                  Your library organizes itself—no folders, no mess.
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
          <Button asChild size="lg">
            <Link href={APP_LINKS.signin}>Get started</Link>
          </Button>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <BookmarkInputLanding />
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
              src="https://www.tella.tv/video/cmb4nsi2h00000bl10w833n83/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </MaxWidthContainer>
    </div>
  );
};
