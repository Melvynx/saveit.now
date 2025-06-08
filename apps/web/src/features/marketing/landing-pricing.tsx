import { MaxWidthContainer } from "@/features/page/page";
import { AUTH_LIMITS } from "@/lib/auth-limits";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { CheckIcon } from "lucide-react";
import Link from "next/link";

export type PricingSectionProps = {};

export const LandingPricing = (props: PricingSectionProps) => {
  return (
    <MaxWidthContainer className="py-16">
      <div className="text-center mb-12">
        <Typography variant="h1" className="mb-4">
          Simple Pricing
        </Typography>
        <Typography variant="lead" className="max-w-2xl mx-auto">
          Start for free, upgrade when you need more. No hidden fees, just great
          features.
        </Typography>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="border rounded-xl shadow-lg overflow-hidden">
          <div className="bg-muted p-8">
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h2" className="mb-1">
                Free Plan
              </Typography>
              <Badge variant="secondary">Free</Badge>
            </div>
            <div className="flex items-baseline gap-1 mb-4">
              <Typography variant="h3" className="text-4xl font-bold">
                $0
              </Typography>
              <Typography className="text-xl">/month</Typography>
            </div>
            <Typography>
              Perfect for getting started with bookmarking
            </Typography>
          </div>

          <div className="p-8 bg-card text-card-foreground">
            <ul className="space-y-4">
              {[
                `${AUTH_LIMITS.free?.bookmarks ?? 20} bookmarks`,
                `${AUTH_LIMITS.free?.monthlyBookmarks ?? 20} bookmarks per month`,
                "Chrome extension",
                "Basic tagging system",
                "Visual previews",
                "Community support",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <Typography>{feature}</Typography>
                </li>
              ))}
            </ul>

            <Button asChild className="w-full mt-8" size="lg" variant="outline">
              <Link href="/auth/signin">Get Started Free</Link>
            </Button>

            <Typography variant="muted" className="text-center mt-4">
              No credit card required
            </Typography>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="border rounded-xl shadow-lg overflow-hidden relative">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
            Most Popular
          </Badge>

          <div className="bg-primary p-8 text-primary-foreground">
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h2" className="mb-1">
                Pro Plan
              </Typography>
              <Badge
                variant="secondary"
                className="bg-primary-foreground text-primary"
              >
                Pro
              </Badge>
            </div>
            <div className="flex items-baseline gap-1 mb-4">
              <Typography variant="h3" className="text-4xl font-bold">
                $5
              </Typography>
              <Typography className="text-xl">/month</Typography>
            </div>
            <Typography>
              Everything you need to organize your digital knowledge
            </Typography>
          </div>

          <div className="p-8 bg-card text-card-foreground">
            <Typography variant="muted" className="mb-4 font-medium">
              Everything in Free, plus:
            </Typography>

            <ul className="space-y-4">
              {[
                "Unlimited bookmarks",
                "AI-powered summaries",
                "Smart tagging system",
                "Advanced AI search",
                "YouTube video transcript",
                "Sharing capabilities",
                "Full API access",
                "Priority support",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <Typography>{feature}</Typography>
                </li>
              ))}
            </ul>

            <Button asChild className="w-full mt-8" size="lg">
              <Link href="/auth/signin">Upgrade to Pro</Link>
            </Button>

            <Typography variant="muted" className="text-center mt-4">
              7-day money-back guarantee. No questions asked.
            </Typography>
          </div>
        </div>
      </div>
    </MaxWidthContainer>
  );
};
