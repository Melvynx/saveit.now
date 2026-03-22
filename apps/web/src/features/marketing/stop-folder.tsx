/* eslint-disable @next/next/no-img-element */
import { Input } from "@workspace/ui/components/input";
import { MaxWidthContainer } from "../page/page";

export const StopFolder = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <p className="text-sm text-[#666] mb-4">
            004 — The problem
          </p>
          <h2 className="font-elegant text-4xl md:text-5xl tracking-tight text-[#fafafa]">
            Folders
            <br />
            <span className="italic text-[#666]">are dead.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Traditional */}
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 relative overflow-hidden">
            <p className="text-xs text-[#888] mb-4">
              THE OLD WAY
            </p>
            <p className="text-[#666] mb-6">
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
                  className="text-[#444]"
                />
                <line
                  x1="90"
                  y1="10"
                  x2="10"
                  y2="90"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-[#444]"
                />
              </svg>
            </div>
          </div>

          {/* Agentic */}
          <div className="rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-6">
            <p className="text-xs text-[#888] mb-4">THE NEW WAY</p>
            <p className="text-[#fafafa] mb-6">
              Just describe what you're looking for. Your agent finds it
              instantly.
            </p>
            <div className="space-y-3">
              <Input
                className="h-12 text-base bg-[#141414] border-[#2a2a2a] text-[#fafafa] placeholder:text-[#555]"
                placeholder="That article about productivity..."
                readOnly
              />
              <p className="text-xs text-[#555]">
                Search by meaning, not keywords
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
