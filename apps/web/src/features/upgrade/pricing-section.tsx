"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { AUTH_LIMITS } from "@/lib/auth-limits";
import { useSession } from "@/lib/auth-client";
import { useAsyncTask } from "@/lib/use-async-task";
import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Typography } from "@workspace/ui/components/typography";
import { useAction } from "convex/react";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
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
  const session = useSession();
  const navigate = useNavigate();
  const createCheckout = useAction(api.stripe.actions.createCheckout);

  // Upgrading requires an authenticated Convex session (createCheckout is an
  // authAction). Send logged-out visitors through sign-in and bring them back
  // to /upgrade/new-pricing afterwards via the redirectUrl param.
  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      void navigate({
        to: "/signin",
        search: { redirectUrl: "/upgrade/new-pricing" },
      });
    }
  }, [navigate, session.data?.user, session.isPending]);

  const checkoutTask = useAsyncTask(
    async () => {
      const result = await createCheckout({
        plan: "pro",
        successUrl: "/upgrade/success",
        cancelUrl: "/upgrade?error=true",
        annual: !monthly,
      });

      window.location.href = result.url;
    },
    {
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to upgrade",
        );
      },
    },
  );

  // Logged-out visitors are being redirected by the effect above; render
  // nothing to avoid flashing the pricing card before navigation completes.
  if (!session.isPending && !session.data?.user) {
    return null;
  }

  return (
    <div className="py-12 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl text-center">
          <Typography as="h2" className="text-3xl font-semibold sm:text-5xl">
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

        <div className="mx-auto mt-8 flex w-full justify-center sm:w-auto">
          <Tabs
            value={monthly ? "monthly" : "yearly"}
            onValueChange={(value) => setMonthly(value === "monthly")}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-fit">
              <TabsTrigger value="monthly" className="w-full">
                Monthly
              </TabsTrigger>
              <div className="relative min-w-0">
                <TabsTrigger value="yearly" className="w-full pr-10 sm:pr-1.5">
                  Yearly
                </TabsTrigger>
                <Badge
                  className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 bg-card text-[10px] sm:-right-5 sm:-top-4 sm:translate-y-0 sm:text-xs"
                  variant="outline"
                >
                  -49%
                </Badge>
              </div>
            </TabsList>
          </Tabs>
        </div>

        <div className="mx-auto mt-10 grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
          <Card className="w-full min-w-0 rounded-3xl p-6 ring-1 ring-border sm:p-10">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <Typography
                as="h3"
                className="min-w-0 text-2xl font-semibold sm:text-3xl"
              >
                SaveIt<span className="text-muted-foreground">.free</span>
              </Typography>
              <Badge variant="secondary">Free</Badge>
            </div>

            <Typography as="p" variant="muted" className="mt-6">
              Perfect for getting started with bookmarking and organizing your
              digital content.
            </Typography>

            <div className="mt-6 flex min-w-0 flex-wrap items-baseline gap-x-2">
              <Typography
                as="span"
                className="text-4xl font-semibold sm:text-5xl"
              >
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

            <div className="mt-10 flex min-w-0 items-center gap-x-4">
              <Typography
                as="h4"
                className="min-w-0 flex-none text-sm font-semibold text-primary"
              >
                What&apos;s included
              </Typography>
              <div className="h-px flex-auto bg-border" />
            </div>

            <ul role="list" className="mt-8 min-w-0 space-y-4 text-sm">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex min-w-0 items-center gap-x-3">
                  <Check className="h-5 w-5 flex-none text-primary" />
                  <Typography variant="muted">{feature}</Typography>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="mt-10 w-full" disabled>
              Current Plan
            </Button>
          </Card>

          <Card className="relative w-full min-w-0 rounded-3xl p-6 ring-2 ring-primary sm:p-10">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
              Most Popular
            </Badge>

            <div className="flex min-w-0 items-center justify-between gap-3">
              <Typography
                as="h3"
                className="min-w-0 text-2xl font-semibold sm:text-3xl"
              >
                SaveIt<span className="text-primary font-bold">.pro</span>
              </Typography>
              <Badge>Pro</Badge>
            </div>

            <Typography as="p" variant="muted" className="mt-6">
              Elevate your browsing experience with powerful bookmarking, AI
              summaries, and unlimited exports.
            </Typography>

            <div className="mt-6 flex min-w-0 flex-wrap items-baseline gap-x-2">
              <Typography
                as="span"
                className="text-4xl font-semibold sm:text-5xl"
              >
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

            <div className="mt-10 flex min-w-0 items-center gap-x-4">
              <Typography
                as="h4"
                className="min-w-0 flex-none text-sm font-semibold text-primary"
              >
                Everything in Free, plus
              </Typography>
              <div className="h-px flex-auto bg-border" />
            </div>

            <ul role="list" className="mt-8 min-w-0 space-y-4 text-sm">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex min-w-0 items-center gap-x-3">
                  <Check className="h-5 w-5 flex-none text-primary" />
                  <Typography variant="muted">{feature}</Typography>
                </li>
              ))}
            </ul>

            <LoadingButton
              loading={checkoutTask.isPending}
              onClick={() => void checkoutTask.run()}
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
