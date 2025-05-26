"use client";

import { Suspense } from "react";
import { PricingSection } from "../pricing-section";

export default function NewPricingPage() {
  return (
    <Suspense>
      <PricingSection />
    </Suspense>
  );
}
