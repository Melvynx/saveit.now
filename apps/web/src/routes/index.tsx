import { createFileRoute } from "@tanstack/react-router";

import { V2Agent } from "@/features/marketing/v2/v2-agent";
import { V2Closing } from "@/features/marketing/v2/v2-closing";
import { V2Header } from "@/features/marketing/v2/v2-header";
import { V2Hero } from "@/features/marketing/v2/v2-hero";
import { V2Ios } from "@/features/marketing/v2/v2-ios";
import { V2Pricing } from "@/features/marketing/v2/v2-pricing";
import { V2Problem } from "@/features/marketing/v2/v2-problem";
import { V2_HEAD_LINKS, V2Style } from "@/features/marketing/v2/v2-theme";
import { Footer } from "@/features/page/footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SaveIt.now: A home for everything you save" },
      {
        name: "description",
        content:
          "One tap to save any link. An AI agent reads it, files it, and finds it back the moment you ask. Zero folders, zero tags, zero organizing.",
      },
    ],
    links: V2_HEAD_LINKS,
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="v2-page bg-[#120a10] text-[#f7ede8]">
      <V2Style />
      <V2Header />
      <V2Hero />
      <V2Problem />
      <V2Agent />
      <V2Ios />
      <V2Pricing />
      <V2Closing />
      <Footer />
    </div>
  );
}
