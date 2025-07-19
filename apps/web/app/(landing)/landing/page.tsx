import { FAQ } from "@/features/marketing/faq";
import { KeyFeatures } from "@/features/marketing/key-features";
import { LandingHero } from "@/features/marketing/landing-hero";
import { LandingPricing } from "@/features/marketing/landing-pricing";
import { StopFolder } from "@/features/marketing/stop-folder";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";

export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <div>
      <Header />
      <LandingHero />
      <KeyFeatures />
      <StopFolder />
      <LandingPricing />
      <FAQ />
      <Footer />
    </div>
  );
}
