import { AgenticDemoChat } from "@/features/marketing/agentic-demo-chat";
import { ExtensionsSection } from "@/features/marketing/extensions-section";
import { FAQ } from "@/features/marketing/faq";
import { HeroVideo } from "@/features/marketing/hero-video";
import { KeyFeatures } from "@/features/marketing/key-features";
import { LandingHero } from "@/features/marketing/landing-hero";
import { LandingPricing } from "@/features/marketing/landing-pricing";
import { StopFolder } from "@/features/marketing/stop-folder";
import { WhatIsAgentic } from "@/features/marketing/what-is-agentic";
import { WhySaveIt } from "@/features/marketing/why-saveit";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";

export default function LandingPage() {
  return (
    <div>
      <Header />
      <LandingHero />
      <HeroVideo />
      <AgenticDemoChat />
      <WhatIsAgentic />
      <WhySaveIt />
      <StopFolder />
      <KeyFeatures />
      <ExtensionsSection />
      <LandingPricing />
      <FAQ />
      <Footer />
    </div>
  );
}
