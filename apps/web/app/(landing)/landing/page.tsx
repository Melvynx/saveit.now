import { ExtensionsSection } from "@/features/marketing/extensions-section";
import { FAQ } from "@/features/marketing/faq";
import { HowItWorks } from "@/features/marketing/how-it-works";
import { LandingHeader } from "@/features/marketing/landing-header";
import { LandingHero } from "@/features/marketing/landing-hero";
import { LandingPricing } from "@/features/marketing/landing-pricing";
import { LandingStats } from "@/features/marketing/landing-stats";
import { WhySaveIt } from "@/features/marketing/why-saveit";
import { Footer } from "@/features/page/footer";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingHeader />
      <LandingHero />
      <LandingStats />
      <WhySaveIt />
      <HowItWorks />
      <ExtensionsSection />
      <LandingPricing />
      <FAQ />
      <Footer />
    </div>
  );
}
