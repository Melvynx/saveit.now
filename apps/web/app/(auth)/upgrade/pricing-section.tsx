"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { authClient } from "@/lib/auth-client";
import { AUTH_LIMITS } from "@/lib/auth-limits";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Typography } from "@workspace/ui/components/typography";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const freeFeatures = [
  `${AUTH_LIMITS.free?.bookmarks ?? 20} bookmarks`,
  `${AUTH_LIMITS.free?.monthlyBookmarkRuns ?? 20} bookmark processing runs per month`,
  "Basic exports",
  "Community support",
];

const proFeatures = [
  "Unlimited bookmarks",
  "Unlimited exports",
  "Priority support",
  "Support of a creator",
  "YouTube video transcript",
  "Advanced AI summary",
];

export function PricingSection() {
  const [monthly, setMonthly] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const client = await authClient.subscription.upgrade({
        plan: "pro",
        successUrl: "/upgrade/success",
        cancelUrl: "/upgrade?error=true",
        annual: !monthly,
      });

      if (client.error) {
        throw new Error(client.error.message);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="py-12 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Typography as="h2" className="text-5xl font-semibold sm:text-6xl">
            Simple no-tricks pricing
          </Typography>
          <Typography
            as="p"
            variant="muted"
            className="mx-auto mt-6 max-w-2xl text-lg font-medium sm:text-xl"
          >
            Start for free, upgrade when you need more. No hidden fees, just
            great features.
          </Typography>
        </div>

        <div className="mx-auto mt-8 flex justify-center">
          <Tabs
            value={monthly ? "monthly" : "yearly"}
            onValueChange={(value) => setMonthly(value === "monthly")}
          >
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <div className="relative">
                <TabsTrigger value="yearly" className="relative">
                  Yearly
                </TabsTrigger>
                <Badge
                  className="absolute -top-4 -right-5 text-xs bg-card"
                  variant="outline"
                >
                  -49%
                </Badge>
              </div>
            </TabsList>
          </Tabs>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Free Plan */}
          <Card className="rounded-3xl ring-1 ring-border p-8 sm:p-10">
            <div className="flex items-center justify-between">
              <Typography as="h3" className="text-3xl font-semibold">
                SaveIt<span className="text-muted-foreground">.free</span>
              </Typography>
              <Badge variant="secondary">Free</Badge>
            </div>

            <Typography as="p" variant="muted" className="mt-6">
              Perfect for getting started with bookmarking and organizing your
              digital content.
            </Typography>

            <div className="mt-6 flex items-baseline gap-x-2">
              <Typography as="span" className="text-5xl font-semibold">
                $0
              </Typography>
              <Typography
                as="span"
                variant="muted"
                className="text-sm font-semibold"
              >
                /month
              </Typography>
            </div>

            <div className="mt-10 flex items-center gap-x-4">
              <Typography
                as="h4"
                className="flex-none text-sm font-semibold text-primary"
              >
                What's included
              </Typography>
              <div className="h-px flex-auto bg-border" />
            </div>

            <ul role="list" className="mt-8 space-y-4 text-sm">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex gap-x-3 items-center">
                  <Check className="h-5 w-5 flex-none text-primary" />
                  <Typography variant="muted">{feature}</Typography>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="mt-10 w-full" disabled>
              Current Plan
            </Button>
          </Card>

          {/* Pro Plan */}
          <Card className="rounded-3xl ring-2 ring-primary p-8 sm:p-10 relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
              Most Popular
            </Badge>

            <div className="flex items-center justify-between">
              <Typography as="h3" className="text-3xl font-semibold">
                SaveIt<span className="text-primary font-bold">.pro</span>
              </Typography>
              <Badge>Pro</Badge>
            </div>

            <Typography as="p" variant="muted" className="mt-6">
              Elevate your browsing experience with powerful bookmarking, AI
              summaries, and unlimited exports.
            </Typography>

            <div className="mt-6 flex items-baseline gap-x-2">
              <Typography as="span" className="text-5xl font-semibold">
                ${monthly ? "9" : "5"}
              </Typography>
              <Typography
                as="span"
                variant="muted"
                className="text-sm font-semibold"
              >
                /month
              </Typography>
            </div>

            {!monthly && (
              <Typography variant="muted" className="text-green-500 mt-2">
                5 months free!
              </Typography>
            )}

            <div className="mt-10 flex items-center gap-x-4">
              <Typography
                as="h4"
                className="flex-none text-sm font-semibold text-primary"
              >
                Everything in Free, plus
              </Typography>
              <div className="h-px flex-auto bg-border" />
            </div>

            <ul role="list" className="mt-8 space-y-4 text-sm">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex gap-x-3 items-center">
                  <Check className="h-5 w-5 flex-none text-primary" />
                  <Typography variant="muted">{feature}</Typography>
                </li>
              ))}
            </ul>

            <LoadingButton
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
              className="mt-10 w-full"
            >
              Upgrade Now
            </LoadingButton>

            <Typography
              as="p"
              variant="muted"
              className="mt-6 text-xs text-center"
            >
              Simple and transparent pricing. No hidden fees.
            </Typography>
          </Card>
        </div>
      </div>
    </div>
  );
}
