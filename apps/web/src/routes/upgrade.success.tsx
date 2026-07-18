import { AccountShell } from "@/features/account/account-shell";
import { MaxWidthContainer } from "@/features/page/page";
import ConfettiBurst from "@/features/upgrade/confetti";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { useSession } from "@/lib/auth-client";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { api } from "@convex/_generated/api";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type UpgradeSuccessSearch = {
  session_id?: string;
};

export const Route = createFileRoute("/upgrade/success")({
  validateSearch: (search: Record<string, unknown>): UpgradeSuccessSearch => ({
    session_id:
      typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: UpgradeSuccessPage,
});

function UpgradeSuccessPage() {
  const session = useSession();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const plan = useAuthedQuery(
    api.subscriptions.queries.getUserPlan,
    session.data?.user ? {} : "skip",
  );
  const isPro = plan?.plan === "pro";
  const hasCheckoutSession = Boolean(search.session_id);
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    if (session.isPending || session.data?.user) return;

    const returnUrl = search.session_id
      ? `/upgrade/success?session_id=${encodeURIComponent(search.session_id)}`
      : "/upgrade/success";
    void navigate({
      to: "/signin",
      search: { redirectUrl: returnUrl },
      replace: true,
    });
  }, [navigate, search.session_id, session.data?.user, session.isPending]);

  useEffect(() => {
    if (!isPro || !search.session_id) return;
    trackAnalyticsEvent(ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED);
  }, [isPro, search.session_id]);

  useEffect(() => {
    if (isPro) {
      setIsDelayed(false);
      return;
    }

    const timer = window.setTimeout(() => setIsDelayed(true), 15_000);
    return () => window.clearTimeout(timer);
  }, [isPro]);

  return (
    <AccountShell>
      <MaxWidthContainer className="my-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {isPro
                ? "SaveIt Pro is active"
                : hasCheckoutSession
                  ? "Confirming your upgrade"
                  : "No upgrade to confirm"}
            </CardTitle>
            <CardDescription>
              {isPro
                ? "Your Pro limits are active on this account and every signed-in device."
                : hasCheckoutSession
                  ? "Stripe has returned you to SaveIt. We’re waiting for the verified subscription update before showing Pro as active."
                  : "SaveIt only marks an upgrade complete after a verified checkout updates this account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPro ? (
              <div
                style={{
                  position: "relative",
                  paddingBottom: "56.25%",
                  height: 0,
                }}
              >
                <iframe
                  title="Welcome to SaveIt Pro"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                  src="https://www.tella.tv/video/cmaxiv6tk001z0blda2iu5epj/embed?b=0&title=1&a=1&loop=0&t=0&muted=0&wt=0"
                  allowFullScreen
                />
              </div>
            ) : hasCheckoutSession ? (
              <div
                role="status"
                aria-live="polite"
                className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 px-6 text-center"
              >
                <LoaderCircle className="size-7 animate-spin text-primary" />
                <p className="font-medium">Checking your Pro access…</p>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  {isDelayed
                    ? "This is taking longer than usual. Your checkout is not being repeated; the library remains available while the verified update arrives."
                    : "This usually takes only a few seconds. Keep this page open and it will update automatically."}
                </p>
              </div>
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 px-6 text-center">
                <CircleAlert className="size-7 text-muted-foreground" />
                <p className="font-medium">Start from the Upgrade page</p>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Choose a plan and complete Stripe Checkout. Returning to this
                  URL by itself never changes your subscription.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <a
              className={buttonVariants({
                variant: "default",
                className: "w-full sm:w-auto",
              })}
              href={hasCheckoutSession || isPro ? "/app" : "/upgrade"}
            >
              {isPro
                ? "Open my library"
                : hasCheckoutSession
                  ? "Continue to my library"
                  : "Choose a Pro plan"}
            </a>
            {isPro ? (
              <>
                <a
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full sm:w-auto",
                  })}
                  href="https://discord.gg/saveit"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Discord
                </a>
                <ConfettiBurst />
              </>
            ) : null}
          </CardFooter>
        </Card>
      </MaxWidthContainer>
    </AccountShell>
  );
}
