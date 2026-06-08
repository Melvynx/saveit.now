import { AccountShell } from "@/features/account/account-shell";
import { PricingSection } from "@/features/upgrade/pricing-section";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/upgrade/new-pricing")({
  component: NewPricingPage,
});

function NewPricingPage() {
  return (
    <AccountShell>
      <PricingSection />
    </AccountShell>
  );
}

