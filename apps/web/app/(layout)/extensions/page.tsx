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
import { Input } from "@workspace/ui/components/input";
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
          <div
            style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}
          >
            <iframe
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
              src="https://www.tella.tv/video/cmaxmmrly000b0bla9y100tf2/embed?b=0&title=1&a=1&loop=0&t=0&muted=0&wt=0"
              allowFullScreen
              allowTransparency
            />
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-row gap-4">
            <div className="size-6 justify-center flex text-sm border-primary bg-primary/10 rounded-full items-center border text-primary">
              1
            </div>
            <div className="flex flex-col gap-2">
              <Typography>Download the extensions.</Typography>
              <Button onClick={downloadChromeExtension}>Download</Button>
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <div className="size-6 justify-center flex text-sm border-primary bg-primary/10 rounded-full items-center border text-primary">
              2
            </div>
            <div className="flex flex-col gap-2">
              <Typography>Unzip the file</Typography>
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <div className="size-6 justify-center flex text-sm border-primary bg-primary/10 rounded-full items-center border text-primary">
              3
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <Typography>Go on the extensions settings</Typography>
                <Typography variant="muted">
                  Copy and paste this URL in your browser :
                </Typography>
                <Input
                  value="chrome://extensions/"
                  readOnly
                  className="select-all"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <div className="size-6 justify-center flex text-sm border-primary bg-primary/10 rounded-full items-center border text-primary">
              4
            </div>
            <div className="flex flex-col gap-2">
              <Typography>Click on "Load unpacked"</Typography>
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <div className="size-6 justify-center flex text-sm border-primary bg-primary/10 rounded-full items-center border text-primary">
              5
            </div>
            <div className="flex flex-col gap-2">
              <Typography>
                Drag-and-drop the folder containing the extension
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}
