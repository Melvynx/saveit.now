import { createFileRoute } from "@tanstack/react-router";

import { LandingPricing } from "@/features/marketing/landing-pricing";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  return (
    <div>
      <Header />
      <LandingPricing />
      <Footer />
    </div>
  );
}
