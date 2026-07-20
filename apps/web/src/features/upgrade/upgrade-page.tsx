"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { MaxWidthContainer } from "@/features/page/page";
import { useSession } from "@/lib/auth-client";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { useUserPlan } from "@/lib/auth/user-plan";
import { useAsyncTask } from "@/lib/use-async-task";
import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  CreditCard,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const PRO_FEATURES = [
  "Up to 50,000 bookmarks",
  "AI summaries for articles and videos",
  "Agentic search across your library",
  "Unlimited exports",
  "API access",
  "Priority support",
];

const TRUST_POINTS = [
  {
    label: "Secure checkout with Stripe",
    Icon: ShieldCheck,
  },
  {
    label: "Pro on every signed-in device",
    Icon: MonitorSmartphone,
  },
  {
    label: "Manage or cancel anytime",
    Icon: CreditCard,
  },
];

export function UpgradePage() {
  const [monthly, setMonthly] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const error = searchParams.get("error");
  const canceled = searchParams.get("canceled") === "1";
  const plan = useUserPlan();
  const createCheckout = useAction(api.stripe.actions.createCheckout);

  // Upgrading requires an authenticated Convex session (createCheckout is an
  // authAction). Send logged-out visitors through sign-in and bring them back
  // to /upgrade afterwards via the redirectUrl param.
  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      void navigate({ to: "/signin", search: { redirectUrl: "/upgrade" } });
    }
  }, [navigate, session.data?.user, session.isPending]);

  const checkoutTask = useAsyncTask(
    async () => {
      const result = await createCheckout({
        plan: "pro",
        successUrl: "/upgrade/success",
        cancelUrl: "/upgrade?canceled=1",
        annual: !monthly,
      });

      trackAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_CHECKOUT_STARTED, {
        billing_interval: monthly ? "monthly" : "yearly",
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
    <MaxWidthContainer className="py-4 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        {canceled ? (
          <Alert className="mb-5 flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CircleAlert className="size-4" />
              <AlertTitle>Checkout canceled</AlertTitle>
            </div>
            <AlertDescription>
              No charge was made. You can keep using Free or try again whenever
              you&apos;re ready.
            </AlertDescription>
          </Alert>
        ) : error ? (
          <Alert
            variant="destructive"
            className="mb-5 flex min-w-0 flex-col gap-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle className="size-4" />
              <AlertTitle>Checkout unavailable</AlertTitle>
            </div>
            <AlertDescription>
              We couldn&apos;t open checkout. Please try again in a moment.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mb-6 max-w-2xl sm:mb-8">
          <Badge variant="secondary" className="mb-3 gap-1.5">
            <Sparkles className="size-3.5" />
            SaveIt Pro
          </Badge>
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need to find what you saved.
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-pretty text-sm leading-relaxed sm:text-base">
            More room, smarter retrieval, and the tools to move your knowledge
            wherever you need it.
          </p>
        </div>

        <Card className="gap-0 py-0 ring-primary/25">
          <CardHeader className="gap-5 border-b px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  Choose your billing plan
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Annual billing gives you the lowest monthly price.
                </p>
              </div>
              {!monthly ? (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  Save $48/year
                </Badge>
              ) : null}
            </div>

            <Tabs
              value={monthly ? "monthly" : "yearly"}
              onValueChange={(value) => setMonthly(value === "monthly")}
              className="w-full"
            >
              <TabsList className="grid h-auto min-h-14 w-full grid-cols-2 p-1">
                <TabsTrigger
                  value="monthly"
                  className="min-h-12 w-full flex-col gap-0 px-3 py-2"
                >
                  <span>Monthly</span>
                  <span className="text-xs font-normal opacity-75">
                    $9/month
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="yearly"
                  className="min-h-12 w-full flex-col gap-0 px-3 py-2"
                >
                  <span>Yearly</span>
                  <span className="text-xs font-normal opacity-75">
                    $60/year
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="px-5 py-6 sm:px-7 sm:py-7">
            <div aria-live="polite">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  ${monthly ? "9" : "60"}
                </span>
                <span className="text-muted-foreground text-base">
                  /{monthly ? "month" : "year"}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {monthly
                  ? "Billed monthly. Switch or cancel from Billing."
                  : "Equivalent to $5/month. Billed once per year."}
              </p>
            </div>

            <div className="mt-7 border-t pt-6">
              <h3 className="text-sm font-semibold">Everything in Pro</h3>
              <ul className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {PRO_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex min-w-0 items-start gap-2.5"
                  >
                    <span className="bg-primary/10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                      <Check className="text-primary size-3.5" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>

          <CardFooter className="bg-muted/35 flex-col items-stretch gap-3 border-t p-5 sm:p-7">
            {plan.name === "free" ? (
              <LoadingButton
                loading={checkoutTask.isPending || plan.isLoading}
                disabled={plan.isLoading || session.isPending}
                onClick={() => void checkoutTask.run()}
                className="h-11 w-full"
              >
                Continue to secure checkout
              </LoadingButton>
            ) : (
              <Alert variant="default">
                <CircleAlert className="size-4" />
                <AlertTitle>You already have SaveIt Pro</AlertTitle>
                <AlertDescription>
                  Manage or cancel your subscription from the{" "}
                  <a href="/billing">billing portal</a>.
                </AlertDescription>
              </Alert>
            )}
            {plan.name === "free" ? (
              <p className="text-muted-foreground text-center text-xs leading-relaxed">
                Review your order in Stripe before paying. Your subscription
                renews automatically until canceled.
              </p>
            ) : null}
          </CardFooter>
        </Card>

        <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-3">
          {TRUST_POINTS.map(({ label, Icon }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon className="text-primary size-4 shrink-0" />
              <span className="text-muted-foreground text-xs leading-snug">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MaxWidthContainer>
  );
}
