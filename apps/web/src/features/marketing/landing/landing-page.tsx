import { LandingAgent } from "@/features/marketing/landing/agent";
import { LandingClosing } from "@/features/marketing/landing/closing";
import { LandingHeader } from "@/features/marketing/landing/header";
import { LandingHero } from "@/features/marketing/landing/hero";
import { LandingIos } from "@/features/marketing/landing/ios";
import { LandingPricing } from "@/features/marketing/landing/pricing";
import { LandingProblem } from "@/features/marketing/landing/problem";
import { LANDING_HEAD_LINKS, LandingStyle } from "@/features/marketing/landing/theme";
import { Footer } from "@/features/page/footer";

export const LANDING_HEAD = {
  meta: [
    { title: "SaveIt.now: A home for everything you save" },
    {
      name: "description",
      content:
        "One tap to save any link. An AI agent reads it, files it, and finds it back the moment you ask. Zero folders, zero tags, zero organizing.",
    },
  ],
  links: LANDING_HEAD_LINKS,
};

export function LandingPage() {
  return (
    <div className="landing-page bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <LandingHeader />
      <LandingHero />
      <LandingProblem />
      <LandingAgent />
      <LandingIos />
      <LandingPricing />
      <LandingClosing />
      <Footer />
    </div>
  );
}
