import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowRight } from "lucide-react";
import { MaxWidthContainer } from "../page/page";

export const WhatIsAgentic = () => {
  return (
    <MaxWidthContainer spacing="default" className="py-16">
      <div className="text-center mb-12 flex flex-col gap-2 items-center mx-auto max-w-2xl">
        <Badge variant="outline">What makes it "Agentic"?</Badge>
        <Typography variant="h2">
          AI-powered waits.{" "}
          <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            Agentic works.
          </span>
        </Typography>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="p-6 bg-muted/30 border-destructive/20">
          <Typography variant="h3" className="mb-4 text-muted-foreground">
            Traditional Bookmarks
          </Typography>
          <div className="flex flex-col gap-3">
            <Step number={1} text="You save" muted />
            <Step number={2} text="You organize into folders" muted />
            <Step number={3} text="You search with keywords" muted />
            <Step number={4} text="You (maybe) find it" muted />
          </div>
          <Typography variant="muted" className="mt-4 text-sm">
            All the work is on you. That's why it fails.
          </Typography>
        </Card>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <Typography variant="h3" className="mb-4 text-primary">
            Agentic Bookmarks
          </Typography>
          <div className="flex flex-col gap-3">
            <Step number={1} text="You save" highlight />
            <Step number={2} text="Agent organizes automatically" highlight />
            <Step number={3} text="Agent indexes & summarizes" highlight />
            <Step number={4} text="Agent finds instantly" highlight />
          </div>
          <Typography className="mt-4 text-sm text-primary/80">
            Your agent works autonomously. You just describe what you need.
          </Typography>
        </Card>
      </div>

      <div className="mt-12 text-center max-w-2xl mx-auto">
        <Typography variant="lead" className="text-muted-foreground">
          <b className="text-foreground">
            Agentic = AI that acts, not just assists.
          </b>
          <br />
          Your bookmarks make decisions, organize themselves, and find what you
          need—without being asked.
        </Typography>
      </div>
    </MaxWidthContainer>
  );
};

function Step({
  number,
  text,
  muted,
  highlight,
}: {
  number: number;
  text: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`size-6 rounded-full flex items-center justify-center text-xs font-medium ${
          highlight
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {number}
      </div>
      <ArrowRight
        className={`size-4 ${highlight ? "text-primary" : "text-muted-foreground/50"}`}
      />
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>
        {text}
      </span>
    </div>
  );
}
