"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Typography } from "@workspace/ui/components/typography";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const includedFeatures = [
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
            Became a SaveIt.pro member in one simple subscription with
            straightforward pricing. No hidden fees, just great features.
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

        <div className="mx-auto mt-10 max-w-2xl rounded-3xl ring-1 ring-border sm:mt-12 lg:mx-0 lg:flex lg:max-w-none">
          <div className="p-8 sm:p-10 lg:flex-auto">
            <Typography as="h3" className="text-3xl font-semibold">
              SaveIt<span className="text-primary font-bold">.pro</span>
            </Typography>
            <Typography as="p" variant="muted" className="mt-6">
              Elevate your browsing experience with powerful bookmarking, AI
              summaries, and unlimited exports. Take control of your digital
              knowledge with SaveIt.pro.
            </Typography>

            <div className="mt-10 flex items-center gap-x-4">
              <Typography
                as="h4"
                className="flex-none text-sm font-semibold text-primary"
              >
                What's included
              </Typography>
              <div className="h-px flex-auto bg-border" />
            </div>

            <ul
              role="list"
              className="mt-8 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-6"
            >
              {includedFeatures.map((feature) => (
                <li key={feature} className="flex gap-x-3 items-center">
                  <Check className="h-5 w-5 flex-none text-primary" />
                  <Typography variant="muted">{feature}</Typography>
                </li>
              ))}
            </ul>
          </div>

          <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
            <Card className="h-full rounded-2xl py-10 text-center lg:flex lg:flex-col lg:justify-center lg:py-16">
              <div className="mx-auto max-w-xs px-8">
                <Typography as="p" className="font-semibold">
                  {monthly ? "Billed monthly" : "Billed annually"}
                </Typography>

                <div className="mt-6 flex items-baseline justify-center gap-x-2">
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

                <LoadingButton
                  loading={mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="mt-10 w-full"
                >
                  Upgrade Now
                </LoadingButton>

                <Typography as="p" variant="muted" className="mt-6 text-xs">
                  Simple and transparent pricing. No hidden fees.
                </Typography>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
