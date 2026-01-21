/* eslint-disable @next/next/no-img-element */
import { Input } from "@workspace/ui/components/input";
import { MaxWidthContainer } from "../page/page";

export const StopFolder = () => {
  return (
    <MaxWidthContainer spacing="default" className="py-24">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <p className="text-sm font-mono text-muted-foreground mb-4">
            004 — The problem
          </p>
          <h2 className="text-4xl md:text-5xl font-black leading-[0.9] tracking-tight">
            Folders
            <br />
            <span className="text-muted-foreground font-light">are dead.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Traditional */}
          <div className="rounded-lg border border-dashed p-6 relative overflow-hidden">
            <p className="text-xs font-mono text-muted-foreground mb-4">
              THE OLD WAY
            </p>
            <p className="text-muted-foreground mb-6">
              Organize into folders. Tag everything. Search with exact keywords.
              Still can't find anything.
            </p>
            <div className="h-32 relative">
              <img
                src="/images/landing/folder.png"
                alt="Folder"
                className="size-20 -rotate-12 absolute top-4 left-4 opacity-50"
              />
              <img
                src="/images/landing/mess.png"
                alt="Mess"
                className="size-20 rotate-3 absolute top-4 left-1/2 -translate-x-1/2 opacity-50"
              />
              <img
                src="/images/landing/tags.png"
                alt="Tags"
                className="size-20 rotate-12 absolute top-4 right-4 opacity-50"
              />
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
              >
                <line
                  x1="10"
                  y1="10"
                  x2="90"
                  y2="90"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-destructive/50"
                />
                <line
                  x1="90"
                  y1="10"
                  x2="10"
                  y2="90"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-destructive/50"
                />
              </svg>
            </div>
          </div>

          {/* Agentic */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
            <p className="text-xs font-mono text-primary mb-4">THE NEW WAY</p>
            <p className="text-foreground mb-6">
              Just describe what you're looking for. Your agent finds it
              instantly.
            </p>
            <div className="space-y-3">
              <Input
                className="h-12 text-base"
                placeholder="That article about productivity..."
                readOnly
              />
              <p className="text-xs text-muted-foreground">
                Search by meaning, not keywords
              </p>
            </div>
          </div>
        </div>
      </div>
    </MaxWidthContainer>
  );
};
