import { cn } from "@workspace/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";
import { MaxWidthContainer } from "../page/page";

export const WhatIsAgentic = () => {
  return (
    <MaxWidthContainer spacing="default" className="py-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="text-sm font-mono text-muted-foreground mb-4">
            002 — The difference
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[0.9] tracking-tight">
            AI-powered{" "}
            <span className="text-muted-foreground font-light">waits.</span>
            <br />
            Agentic <span className="text-primary font-light">works.</span>
          </h2>
        </div>

        {/* Comparison table */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Traditional */}
          <div className="rounded-2xl border border-dashed bg-muted/30 p-8">
            <div className="mb-8">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Traditional bookmarks
              </p>
              <p className="text-2xl font-bold text-muted-foreground">
                You do all the work
              </p>
            </div>

            <div className="space-y-4">
              <ComparisonItem text="Manually create folders" negative />
              <ComparisonItem text="Tag everything yourself" negative />
              <ComparisonItem text="Search with exact keywords" negative />
              <ComparisonItem
                text="Scroll through hundreds of results"
                negative
              />
              <ComparisonItem text="Still can't find what you saved" negative />
            </div>
          </div>

          {/* Agentic */}
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-8 relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative mb-8">
              <p className="text-xs font-mono text-primary uppercase tracking-wider mb-2">
                Agentic bookmarks
              </p>
              <p className="text-2xl font-bold text-foreground">
                Your agent does it for you
              </p>
            </div>

            <div className="relative space-y-4">
              <ComparisonItem text="Auto-organizes by content" positive />
              <ComparisonItem text="AI-generated tags & summaries" positive />
              <ComparisonItem text="Search by meaning, not keywords" positive />
              <ComparisonItem text="Instant semantic results" positive />
              <ComparisonItem
                text="Always finds exactly what you need"
                positive
              />
            </div>
          </div>
        </div>

        {/* Bottom stat */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Traditional tools wait for commands.{" "}
            <span className="text-foreground font-medium">
              Your agent works autonomously.
            </span>
          </p>
        </div>
      </div>
    </MaxWidthContainer>
  );
};

function ComparisonItem({
  text,
  positive,
  negative,
}: {
  text: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex items-center justify-center size-6 rounded-full shrink-0",
          positive && "bg-primary/20 text-primary",
          negative && "bg-muted text-muted-foreground",
        )}
      >
        {positive && <CheckIcon className="size-3.5" />}
        {negative && <XIcon className="size-3.5" />}
      </div>
      <span
        className={cn(
          "text-sm",
          positive && "text-foreground",
          negative && "text-muted-foreground",
        )}
      >
        {text}
      </span>
    </div>
  );
}
