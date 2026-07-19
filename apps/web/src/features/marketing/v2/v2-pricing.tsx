import { APP_LINKS } from "@/lib/app-links";
import { CheckIcon } from "lucide-react";
import { LandingAppButton } from "../landing-app-button";
import { V2Reveal } from "./v2-reveal";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to feel the magic of zero organizing.",
    features: ["20 bookmarks", "Agentic search", "Chrome extension", "iOS app"],
    featured: false,
  },
  {
    name: "Pro",
    price: "$5",
    period: "/month, flat",
    description: "Your whole digital life, one home. No per-bookmark pricing.",
    features: [
      "Up to 50,000 bookmarks",
      "API access",
      "Export to CSV",
      "Priority support",
    ],
    featured: true,
  },
];

export const V2Pricing = () => {
  return (
    <section id="pricing" className="relative bg-[#120a10] px-6 pb-24 sm:pb-32">
      <div className="mx-auto max-w-6xl">
        <V2Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ff8f70]">
            Pricing
          </span>
          <h2 className="mt-4 text-balance text-4xl leading-[1.05] tracking-tight text-[#f7ede8] sm:text-5xl">
            One flat price.{" "}
            <em className="v2-display v2-gradient-text">Zero surprises.</em>
          </h2>
        </V2Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2">
          {TIERS.map((tier, i) => (
            <V2Reveal
              key={tier.name}
              delay={i * 0.1}
              className={
                tier.featured
                  ? "relative rounded-3xl border border-[#ff8f70]/30 bg-gradient-to-b from-[#ff8f50]/[0.08] to-white/[0.03] p-8"
                  : "rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8"
              }
            >
              {tier.featured && (
                <span className="absolute -top-3 right-8 rounded-full bg-gradient-to-r from-[#ff8f50] to-[#f0648e] px-3 py-1 text-[11px] font-semibold text-white">
                  Most popular
                </span>
              )}
              <p className="text-sm font-medium text-[#c9a99b]">{tier.name}</p>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="v2-display text-5xl tracking-tight text-[#f7ede8]">
                  {tier.price}
                </span>
                <span className="text-sm text-[#8a7078]">{tier.period}</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[#a89099]">
                {tier.description}
              </p>

              <ul className="mt-7 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 text-sm text-[#f7ede8]"
                  >
                    <CheckIcon className="size-4 shrink-0 text-[#ff8f70]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {tier.featured ? (
                  <a
                    href={APP_LINKS.upgrade}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ff8f50] to-[#f0648e] text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.96]"
                  >
                    Go Pro
                  </a>
                ) : (
                  <LandingAppButton
                    className="h-11 w-full rounded-full border border-white/15 bg-white/[0.06] text-sm font-medium text-[#f7ede8] transition-[background-color,transform] hover:bg-white/[0.12] active:scale-[0.96]"
                    signedOutChildren="Start free"
                    variant="outline"
                  />
                )}
              </div>
            </V2Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
