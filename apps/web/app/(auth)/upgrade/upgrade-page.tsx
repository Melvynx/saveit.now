"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { FeaturesList } from "@/features/marketing/features-list";
import { MaxWidthContainer } from "@/features/page/page";
import { authClient } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { useMutation } from "@tanstack/react-query";
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
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";
import { toast } from "sonner";

export function UpgradePage() {
  const [monthly, setMonthly] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const plan = useUserPlan();
  const posthog = usePostHog();

  const mutation = useMutation({
    mutationFn: async () => {
      posthog.capture("upgrade_subscription", {
        plan: monthly ? "monthly" : "yearly",
      });

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
    <MaxWidthContainer className="flex flex-row gap-12 w-full my-8 lg:my-12">
      <FeaturesList />
      <div className="flex-1 flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive" className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
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
        <Card className="w-full h-fit">
          <CardHeader>
            <CardTitle>
              SaveIt<span className="text-primary font-bold">.pro</span>
            </CardTitle>
            <CardDescription>
              Became a SaveIt.pro member in one simple subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-0.5">
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
            <ul className="flex flex-col gap-2 flex-2 text-muted-foreground text-sm">
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
                loading={mutation.isPending}
                onClick={() => mutation.mutate()}
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
                  subscription in the <Link href="/app/settings">settings</Link>
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>
      </div>
    </MaxWidthContainer>
  );
}
