import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/extensions")({
  component: ExtensionsPage,
});

function ExtensionsPage() {
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
          <a
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "flex-1 flex py-2",
            )}
            href={APP_LINKS.chrome}
            target="_blank"
            rel="noreferrer"
          >
            <img src="https://svgl.app/library/chrome.svg" className="size-6" />
            <Typography>Chrome</Typography>
          </a>
          <a
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "flex-1 flex py-2",
            )}
            href={APP_LINKS.firefox}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src="https://svgl.app/library/firefox.svg"
              className="size-6"
            />
            <Typography>Firefox</Typography>
          </a>
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
          {[
            {
              title: "1. Pin the Extension",
              text: "First, pin the SaveIt extension to your browser toolbar for easy access.",
              src: "/docs/pin-extensions.gif",
              alt: "How to pin the SaveIt extension",
            },
            {
              title: "2. Save Any Link",
              text: "Click the extension icon on any website, YouTube video, X post, PDF, or any other page to save it instantly.",
              src: "/docs/save-link.gif",
              alt: "How to save a link with the extension",
            },
            {
              title: "3. Save Images",
              text: 'Right-click on any image and select "Save Image" to add it to your collection.',
              src: "/docs/save-image2.gif",
              alt: "How to save an image with the extension",
            },
          ].map((step) => (
            <div key={step.title} className="space-y-4">
              <Typography variant="large">{step.title}</Typography>
              <Typography variant="muted">{step.text}</Typography>
              <div className="flex justify-center">
                <img
                  src={step.src}
                  alt={step.alt}
                  className="rounded-lg border max-w-full h-auto"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}
