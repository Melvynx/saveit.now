import { APP_LINKS } from "@/lib/app-links";
import { AUTH_LIMITS } from "@/lib/auth-limits";
import { CheckIcon } from "lucide-react";
import Link from "next/link";

const tiers = [
  {
    name: "Free",
    id: "tier-free",
    href: APP_LINKS.signin,
    priceMonthly: "$0",
    description:
      "Perfect for getting started with bookmarking and organizing your digital content.",
    features: [
      `${AUTH_LIMITS.free?.bookmarks ?? 20} bookmarks`,
      "Chrome extension",
    ],
    featured: false,
  },
  {
    name: "Pro",
    id: "tier-pro",
    href: APP_LINKS.signin,
    priceMonthly: "$5",
    description:
      "Everything you need to organize your digital knowledge with advanced features.",
    features: [
      "Unlimited bookmarks",
      "API Access",
      "Export to CSV",
      "Priority support",
    ],
    featured: true,
  },
];

export const LandingPricing = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <p className="text-sm text-[#666] mb-4">007 - Pricing</p>

      <div>
        <h2 className="font-elegant text-4xl md:text-5xl tracking-tight text-[#fafafa]">
          Choose the right plan <em>for you</em>
        </h2>
      </div>

      <p className="mt-6 max-w-2xl text-base text-[#888]">
        Start for free, upgrade when you need more. No hidden fees, just great
        features for organizing your digital knowledge.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px rounded-xl border border-[#2a2a2a] overflow-hidden mt-16">
        {tiers.map((tier, tierIdx) => (
          <div
            key={tier.id}
            className={`bg-[#1a1a1a] p-8 ${tierIdx === 0 && !tier.featured ? "lg:border-r border-[#2a2a2a]" : ""}`}
          >
            <h3 id={tier.id} className="text-base font-medium text-[#fafafa]">
              {tier.name}
            </h3>

            <p className="mt-4 flex items-baseline gap-x-2">
              <span className="text-5xl font-semibold tracking-tight text-[#fafafa]">
                {tier.priceMonthly}
              </span>
              <span className="text-[#666]">/month</span>
            </p>

            <p className="mt-6 text-base text-[#888]">
              {tier.description}
            </p>

            <ul role="list" className="mt-8 space-y-3 text-sm text-[#888] sm:mt-10">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-x-3">
                  <CheckIcon
                    aria-hidden="true"
                    className="h-6 w-5 flex-none text-[#fafafa]"
                  />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={tier.href}
              aria-describedby={tier.id}
              className={`mt-8 inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-medium w-full text-center transition-colors ${
                tier.featured
                  ? "bg-[#fafafa] text-[#141414] hover:bg-[#e0e0e0]"
                  : "border border-white/10 text-[#fafafa] hover:bg-white/5"
              }`}
            >
              {tier.featured ? "Upgrade to Pro" : "Get Started Free"}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};
