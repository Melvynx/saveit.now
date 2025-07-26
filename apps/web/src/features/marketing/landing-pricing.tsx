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

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const LandingPricing = () => {
  return (
    <div className="relative isolate bg-background px-6 py-24 sm:py-32 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="mx-auto aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary/30 to-primary/20 opacity-30"
        />
      </div>
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-base/7 font-semibold text-primary">Pricing</h2>
        <p className="mt-2 text-5xl font-semibold tracking-tight text-balance text-foreground sm:text-6xl">
          Choose the right plan for you
        </p>
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-medium text-pretty text-muted-foreground sm:text-xl/8">
        Start for free, upgrade when you need more. No hidden fees, just great
        features for organizing your digital knowledge.
      </p>
      <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-2">
        {tiers.map((tier, tierIdx) => (
          <div
            key={tier.id}
            className={classNames(
              tier.featured
                ? "relative bg-card-foreground shadow-2xl"
                : "bg-card/60 sm:mx-8 lg:mx-0",
              tier.featured
                ? ""
                : tierIdx === 0
                  ? "rounded-t-3xl sm:rounded-b-none lg:rounded-tr-none lg:rounded-bl-3xl"
                  : "sm:rounded-t-none lg:rounded-tr-3xl lg:rounded-bl-none",
              "rounded-3xl p-8 ring-1 ring-border sm:p-10",
            )}
          >
            <h3
              id={tier.id}
              className={classNames(
                tier.featured ? "text-primary" : "text-primary",
                "text-base/7 font-semibold",
              )}
            >
              {tier.name}
            </h3>
            <p className="mt-4 flex items-baseline gap-x-2">
              <span
                className={classNames(
                  tier.featured ? "text-card" : "text-foreground",
                  "text-5xl font-semibold tracking-tight",
                )}
              >
                {tier.priceMonthly}
              </span>
              <span
                className={classNames(
                  tier.featured ? "text-card/70" : "text-muted-foreground",
                  "text-base",
                )}
              >
                /month
              </span>
            </p>
            <p
              className={classNames(
                tier.featured ? "text-card/80" : "text-muted-foreground",
                "mt-6 text-base/7",
              )}
            >
              {tier.description}
            </p>
            <ul
              role="list"
              className={classNames(
                tier.featured ? "text-card/80" : "text-muted-foreground",
                "mt-8 space-y-3 text-sm/6 sm:mt-10",
              )}
            >
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-x-3">
                  <CheckIcon
                    aria-hidden="true"
                    className={classNames(
                      tier.featured ? "text-primary" : "text-primary",
                      "h-6 w-5 flex-none",
                    )}
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={tier.href}
              aria-describedby={tier.id}
              className={classNames(
                tier.featured
                  ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:outline-primary"
                  : "text-primary ring-1 ring-primary/20 ring-inset hover:ring-primary/30 focus-visible:outline-primary",
                "mt-8 block rounded-md px-3.5 py-2.5 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 sm:mt-10",
              )}
            >
              {tier.featured ? "Upgrade to Pro" : "Get Started Free"}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
