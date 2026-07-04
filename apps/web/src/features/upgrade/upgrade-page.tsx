"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { FeaturesList } from "@/features/marketing/features-list";
import { MaxWidthContainer } from "@/features/page/page";
import { useSession } from "@/lib/auth-client";
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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Typography } from "@workspace/ui/components/typography";
import {
  AlertTriangle,
  CircleAlert,
  FileUp,
  Heart,
  Infinity as InfinityIcon,
  Phone,
} from "lucide-react";
import { useAction } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function UpgradePage() {
  const [monthly, setMonthly] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const error = searchParams.get("error");
  const plan = useUserPlan();
  const posthog = usePostHog();
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
      posthog.capture("upgrade_subscription", {
        plan: monthly ? "monthly" : "yearly",
      });

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
    <MaxWidthContainer className="my-8 flex w-full min-w-0 flex-col gap-12 lg:my-12 lg:flex-row">
      <FeaturesList />
      <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
        {error ? (
          <Alert variant="destructive" className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle className="size-4" />
              <AlertTitle>Error</AlertTitle>
            </div>
            <AlertDescription>
              An error occurred while upgrading your subscription. Please try
              again.
            </AlertDescription>
          </Alert>
        ) : null}
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
        <Card className="h-fit w-full min-w-0">
          <CardHeader>
            <CardTitle>
              SaveIt<span className="text-primary font-bold">.pro</span>
            </CardTitle>
            <CardDescription>
              Became a SaveIt.pro member in one simple subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-w-0 flex-wrap items-baseline gap-0.5">
              <Typography className="text-2xl font-bold">
                ${monthly ? "9" : "5"}
              </Typography>
              <Typography variant="muted">/month</Typography>
              {!monthly && (
                <Typography variant="muted" className="text-green-500 ml-2">
                  5 month free !
                </Typography>
              )}
            </div>
            <Typography variant="muted">
              {monthly ? "Billed monthly." : "Billed annually."}
            </Typography>
          </CardContent>
          <CardFooter className="border-t flex flex-col gap-2 items-start">
            <Typography variant="muted">
              Simple and transparent pricing. No hidden fees.
            </Typography>
            <ul className="flex flex-2 min-w-0 flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <InfinityIcon className="text-primary size-4" />
                <span>Unlimited bookmarks</span>
              </li>
              <li className="flex items-center gap-2">
                <FileUp className="text-primary size-4" />
                <span>Unlimited exports</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="text-primary size-4" />
                <span>Priority support</span>
              </li>
              <li className="flex items-center gap-2">
                <Heart className="text-primary size-4" />
                <span>Support of a creator</span>
              </li>
            </ul>
            {plan.name === "free" ? (
              <LoadingButton
                loading={checkoutTask.isPending}
                onClick={() => void checkoutTask.run()}
                className="w-full"
              >
                Upgrade
              </LoadingButton>
            ) : (
              <Alert variant="default">
                <CircleAlert className="size-4" />
                <AlertTitle>You are already a member of SaveIt.pro</AlertTitle>
                <AlertDescription>
                  You are already a member of SaveIt.pro. You can manage your
                  subscription in the <a href="/app/settings">settings</a>
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>
        <div className="min-w-0 rounded-lg border bg-card p-4">
          <Typography variant="large" className="font-medium">
            How to upgrade
          </Typography>
          <Typography variant="muted" className="mt-1">
            SaveIt.pro is managed from the web. Subscriptions are not sold
            inside the mobile apps — to go premium, upgrade here on saveit.now.
          </Typography>
          <ol className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold">1.</span>
              <span>
                Sign in to your SaveIt.now account (you&apos;ll be brought back
                to this page automatically).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold">2.</span>
              <span>Pick a monthly or yearly plan above.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold">3.</span>
              <span>
                Click <span className="text-foreground">Upgrade</span> to
                complete a secure checkout with Stripe.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold">4.</span>
              <span>
                Pro unlocks everywhere instantly — including the mobile app and
                browser extensions.
              </span>
            </li>
          </ol>
        </div>
      </div>
    </MaxWidthContainer>
  );
}
