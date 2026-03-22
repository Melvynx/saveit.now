import { cn } from "@workspace/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";
import { MaxWidthContainer } from "../page/page";

export const WhatIsAgentic = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="text-sm text-[#666] mb-4">
            002 — The difference
          </p>
          <h2 className="font-elegant text-4xl md:text-5xl lg:text-6xl tracking-tight text-[#fafafa]">
            AI-powered{" "}
            <span className="italic text-[#666]">waits.</span>
            <br />
            Agentic <span className="italic text-[#fafafa]">works.</span>
          </h2>
        </div>

        {/* Comparison table */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Traditional */}
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-8">
            <div className="mb-8">
              <p className="text-xs text-[#888] uppercase tracking-wider mb-2">
                Traditional bookmarks
              </p>
              <p className="text-2xl font-bold text-[#666]">
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
          <div className="rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-8 relative overflow-hidden">
            <div className="relative mb-8">
              <p className="text-xs text-[#888] uppercase tracking-wider mb-2">
                Agentic bookmarks
              </p>
              <p className="text-2xl font-bold text-[#fafafa]">
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
          <p className="text-[#888]">
            Traditional tools wait for commands.{" "}
            <span className="text-[#fafafa] font-medium">
              Your agent works autonomously.
            </span>
          </p>
        </div>
      </div>
    </section>
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
          positive && "bg-[#fafafa]/10 text-[#fafafa]",
          negative && "bg-[#2a2a2a] text-[#555]",
        )}
      >
        {positive && <CheckIcon className="size-3.5" />}
        {negative && <XIcon className="size-3.5" />}
      </div>
      <span
        className={cn(
          "text-sm",
          positive && "text-[#fafafa]",
          negative && "text-[#666]",
        )}
      >
        {text}
      </span>
    </div>
  );
}
