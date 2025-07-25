import { ExtensionsSection } from "@/features/marketing/extensions-section";
import { FAQ } from "@/features/marketing/faq";
import { KeyFeatures } from "@/features/marketing/key-features";
import { LandingHero } from "@/features/marketing/landing-hero";
import { LandingPricing } from "@/features/marketing/landing-pricing";
import { StopFolder } from "@/features/marketing/stop-folder";
import { WhySaveIt } from "@/features/marketing/why-saveit";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";

export default function LandingPage() {
  return (
    <div>
      <Header />
      <LandingHero />
      <KeyFeatures />
      <WhySaveIt />
      <ExtensionsSection />
      <StopFolder />
      <LandingPricing />
      <FAQ />
      <Footer />
    </div>
  );
}
