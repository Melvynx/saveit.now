/* eslint-disable @next/next/no-img-element */
"use client";

import { MaxWidthContainer } from "@/features/page/page";
import { APP_LINKS } from "@/lib/app-links";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";

export default function RoutePage() {
  return (
    <MaxWidthContainer className="space-y-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Browser Extensions</CardTitle>
          <CardDescription>
            Install our extension to save anything you find online with just one
            click.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 lg:flex-row">
          <Link
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "flex-1 flex py-2",
            )}
            href={APP_LINKS.chrome}
            target="_blank"
          >
            <img src="https://svgl.app/library/chrome.svg" className="size-6" />
            <Typography>Chrome</Typography>
          </Link>
          <Link
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "flex-1 flex py-2",
            )}
            href={APP_LINKS.firefox}
            target="_blank"
          >
            <img
              src="https://svgl.app/library/firefox.svg"
              className="size-6"
            />
            <Typography>Firefox</Typography>
          </Link>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>How to Use the Extension</CardTitle>
          <CardDescription>
            Follow these simple steps to start saving anything you find online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <Typography variant="large">1. Pin the Extension</Typography>
            <Typography variant="muted">
              First, pin the SaveIt extension to your browser toolbar for easy
              access.
            </Typography>
            <div className="flex justify-center">
              <img
                src="/docs/pin-extensions.gif"
                alt="How to pin the SaveIt extension"
                className="rounded-lg border max-w-full h-auto"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Typography variant="large">2. Save Any Link</Typography>
            <Typography variant="muted">
              Click the extension icon on any website, YouTube video, X post,
              PDF, or any other page to save it instantly.
            </Typography>
            <div className="flex justify-center">
              <img
                src="/docs/save-link.gif"
                alt="How to save a link with the extension"
                className="rounded-lg border max-w-full h-auto"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Typography variant="large">3. Save Images</Typography>
            <Typography variant="muted">
              Right-click on any image and select "Save Image" to add it to your
              collection.
            </Typography>
            <div className="flex justify-center">
              <img
                src="/docs/save-image2.gif"
                alt="How to save an image with the extension"
                className="rounded-lg border max-w-full h-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}
