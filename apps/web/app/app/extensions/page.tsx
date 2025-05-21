"use client";

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
            Our extensions is currently in beta. You can install it from the ZIP
            file !
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Typography>Download the extensions.</Typography>
          <Button onClick={downloadChromeExtension}>Download</Button>
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}
