"use client";

import { MaxWidthContainer } from "@/features/page/page";
import { APP_LINKS } from "@/lib/app-links";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import Link from "next/link";

export default function RoutePage() {
  const downloadChromeExtension = () => {
    const link = document.createElement("a");
    link.href = "/extensions/chrome/v1.0.0.zip";
    link.download = "chrome-extension.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MaxWidthContainer>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Chrome Extensions</CardTitle>
          <CardDescription>
            Install our extension like any other extension.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 lg:flex-row">
          <Button asChild className="flex-1" variant="outline" size="lg">
            <Link href={APP_LINKS.extensions} target="_blank">
              <img
                src="https://svgl.app/library/chrome.svg"
                className="size-6"
              />
              <Typography>Chrome</Typography>
            </Link>
          </Button>
          <div className="flex-1 flex-col flex gap-2 items-center">
            <Button disabled variant="outline" size="lg" className="w-full">
              <img
                src="https://svgl.app/library/firefox.svg"
                className="size-6"
              />
              <Typography>Firefox</Typography>
            </Button>
            <Typography variant="muted">Coming soon</Typography>
          </div>
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}
