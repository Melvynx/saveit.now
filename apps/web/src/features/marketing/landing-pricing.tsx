import { MaxWidthContainer } from "@/features/page/page";
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
          Just $5 a month for unlimited access to all features. No tiers, no
          hidden fees, no nonsense.
        </Typography>
      </div>

      <div className="max-w-lg mx-auto border rounded-xl shadow-lg overflow-hidden">
        <div className="bg-primary p-8 text-primary-foreground">
          <Typography variant="h2" className="mb-1">
            Pro Plan
          </Typography>
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
          <ul className="space-y-4">
            {[
              "Unlimited bookmarks",
              "AI-powered summaries",
              "Chrome extension",
              "Smart tagging system",
              "Advanced AI search",
              "Visual previews",
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
            <Link href="/auth/signin">Get Started</Link>
          </Button>

          <Typography variant="muted" className="text-center mt-4">
            7-day money-back guarantee. No questions asked.
          </Typography>
        </div>
      </div>
    </MaxWidthContainer>
  );
};
