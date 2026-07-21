"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { LandingStyle } from "@/features/marketing/landing/theme";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { useSession } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { APP_LINKS } from "@/lib/app-links";
import { useAsyncTask } from "@/lib/use-async-task";
import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Cloud,
  CreditCard,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const PRO_BENEFITS = [
  {
    title: "Save the whole rabbit hole",
    description: "Keep up to 50,000 bookmarks in one calm, searchable place.",
    Icon: Cloud,
  },
  {
    title: "Ask. Don’t dig.",
    description: "Agentic search finds the idea, even when you forgot the title.",
    Icon: Search,
  },
  {
    title: "Get the point, faster",
    description: "AI summaries turn long articles and videos into quick answers.",
    Icon: WandSparkles,
  },
  {
    title: "Your library stays yours",
    description: "Export without limits and connect your own tools through the API.",
    Icon: Check,
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

  if (!session.isPending && !session.data?.user) {
    return null;
  }

  return (
    <main className="landing-page landing-dusk dark relative min-h-screen overflow-hidden bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <style>{`
        .upgrade-layout {
          display: grid;
          grid-template-areas: "visual" "intro" "checkout" "benefits";
        }
        #tchao-widget-root {
          display: none;
        }
        @media (min-width: 1024px) {
          .upgrade-layout {
            grid-template-columns: minmax(0, 1.08fr) minmax(390px, 0.78fr);
            grid-template-areas: "intro checkout" "visual checkout" "benefits checkout";
          }
        }
      `}</style>

      <div className="landing-noise absolute inset-0" />
      <div className="pointer-events-none absolute -top-56 left-1/2 h-[34rem] w-[48rem] -translate-x-1/2 rounded-full bg-[#f0648e]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-12rem] top-[42rem] size-[28rem] rounded-full bg-[#ff8f70]/10 blur-3xl lg:top-40" />

      <header className="relative z-20 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <a
          href="/"
          className="landing-display text-xl tracking-tight text-[#f7ede8] transition-opacity hover:opacity-80 sm:text-2xl"
        >
          SaveIt<span className="text-[#ff8f70]">.now</span>
        </a>
        <a
          href={APP_LINKS.app}
          className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-[#d9c8ce] transition-colors hover:bg-white/[0.09] hover:text-white focus-visible:ring-2 focus-visible:ring-[#ff8f70] focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back to bookmarks</span>
          <span className="sm:hidden">Back</span>
        </a>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24">
        {canceled ? (
          <Alert className="mb-5 border-white/10 bg-white/[0.05] text-[#f7ede8] sm:mb-8">
            <CircleAlert className="size-4" />
            <AlertTitle>Checkout canceled</AlertTitle>
            <AlertDescription className="text-[#b9a5ad]">
              No charge was made. Your bookmarks are right where you left them.
            </AlertDescription>
          </Alert>
        ) : error ? (
          <Alert
            variant="destructive"
            className="mb-5 border-[#ff8f70]/30 bg-[#ff8f70]/10 text-[#ffd7ca] sm:mb-8"
          >
            <AlertTriangle className="size-4" />
            <AlertTitle>Checkout unavailable</AlertTitle>
            <AlertDescription className="text-[#efb9ab]">
              We couldn&apos;t open checkout. Please try again in a moment.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="upgrade-layout gap-x-14 gap-y-7 lg:gap-y-10">
          <section className="[grid-area:intro] lg:pt-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ff8f70]/25 bg-[#ff8f70]/10 px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-[#ffad96] uppercase">
              <Sparkles className="size-3.5" />
              SaveIt Pro
            </div>
            <h1 className="landing-display max-w-[11ch] text-[clamp(3rem,11vw,5.8rem)] leading-[0.92] tracking-[-0.035em] text-[#fff5f0]">
              Find <em className="landing-gradient-text">everything</em> you
              saved.
            </h1>
            <p className="mt-5 max-w-[35rem] text-base leading-relaxed text-[#b9a5ad] sm:text-lg">
              Give every great link more room — then ask for it in plain words
              and get it back before the thought disappears.
            </p>
          </section>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#1a0e15] shadow-[0_32px_100px_rgba(0,0,0,0.4)] [grid-area:visual] lg:rounded-[2rem]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#120a10]/35 via-transparent to-transparent" />
            <img
              src="/images/upgrade/pro-portal.webp"
              alt="A glowing doorway at the end of a path through a twilight landscape"
              width={1600}
              height={1000}
              className="aspect-[16/10] w-full object-cover"
            />
            <div className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#160b12]/70 px-4 py-3 backdrop-blur-xl sm:inset-x-5 sm:bottom-5">
              <div>
                <p className="text-sm font-semibold text-[#fff5f0]">
                  One home. Every rabbit hole.
                </p>
                <p className="mt-0.5 text-xs text-[#b9a5ad]">
                  Searchable whenever inspiration returns.
                </p>
              </div>
              <Search className="size-5 shrink-0 text-[#ff8f70]" />
            </div>
          </div>

          <aside className="[grid-area:checkout] lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#1a0e15]/95 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:rounded-[2rem]">
              <div className="border-b border-white/[0.08] px-5 py-5 sm:px-7 sm:py-6">
                <p className="text-sm font-semibold text-[#fff5f0]">
                  Choose your pace
                </p>
                <p className="mt-1 text-sm text-[#a89099]">
                  Yearly gives you the full experience for less.
                </p>
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                <label className="block cursor-pointer">
                  <input
                    type="radio"
                    name="billing-period"
                    value="yearly"
                    checked={!monthly}
                    onChange={() => setMonthly(false)}
                    className="peer sr-only"
                  />
                  <span className="relative flex min-h-36 flex-col justify-between rounded-2xl border border-[#ff8f70]/25 bg-[#ff8f70]/[0.07] p-5 transition-[background-color,border-color,transform] peer-checked:border-[#ff8f70] peer-checked:bg-[#ff8f70]/[0.12] peer-focus-visible:ring-2 peer-focus-visible:ring-[#ff8f70] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#1a0e15] active:scale-[0.99]">
                    <span className="absolute -top-3 right-4 rounded-full bg-[#ff8f70] px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-[#23100a] uppercase shadow-lg shadow-[#ff8f70]/20">
                      Best value
                    </span>
                    <span className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold tracking-[0.14em] text-[#ffb29d] uppercase">
                        Yearly
                      </span>
                      <span className="flex size-5 items-center justify-center rounded-full border border-[#ff8f70]/60 peer-checked:bg-[#ff8f70]">
                        {!monthly ? (
                          <Check className="size-3.5 text-[#23100a]" />
                        ) : null}
                      </span>
                    </span>
                    <span className="mt-4 flex flex-wrap items-end gap-x-2">
                      <span className="landing-display text-6xl leading-none text-[#fff5f0] tabular-nums">
                        $60
                      </span>
                      <span className="pb-1.5 text-sm text-[#b9a5ad]">
                        / year
                      </span>
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <strong className="font-semibold text-[#ff9d82]">
                        $5/month equivalent
                      </strong>
                      <span className="text-[#8f7982]">·</span>
                      <span className="text-[#b9a5ad]">Save $48/year</span>
                    </span>
                  </span>
                </label>

                <label className="block cursor-pointer">
                  <input
                    type="radio"
                    name="billing-period"
                    value="monthly"
                    checked={monthly}
                    onChange={() => setMonthly(true)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4 transition-[background-color,border-color,transform] peer-checked:border-[#c9a3e8]/70 peer-checked:bg-[#c9a3e8]/[0.08] peer-focus-visible:ring-2 peer-focus-visible:ring-[#c9a3e8] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#1a0e15] active:scale-[0.99]">
                    <span>
                      <span className="block text-sm font-semibold text-[#f7ede8]">
                        Monthly
                      </span>
                      <span className="mt-1 block text-xs text-[#8f7982]">
                        Maximum flexibility
                      </span>
                    </span>
                    <span className="flex items-baseline gap-1.5 text-right">
                      <span className="landing-display text-4xl text-[#f7ede8] tabular-nums">
                        $9
                      </span>
                      <span className="text-xs text-[#a89099]">/ month</span>
                    </span>
                  </span>
                </label>
              </div>

              <div className="px-4 pb-5 sm:px-5 sm:pb-6">
                {plan.name === "free" ? (
                  <>
                    <LoadingButton
                      loading={checkoutTask.isPending || plan.isLoading}
                      disabled={plan.isLoading || session.isPending}
                      onClick={() => void checkoutTask.run()}
                      className="group h-14 w-full rounded-2xl bg-[#ff8f70] px-5 text-base font-semibold text-[#23100a] shadow-[0_14px_36px_rgba(255,143,112,0.22)] hover:bg-[#ff9d82]"
                    >
                      <span>
                        {monthly ? "Choose monthly" : "Choose yearly"}
                      </span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </LoadingButton>
                    <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#8f7982]">
                      <CreditCard className="size-3.5 shrink-0" />
                      <span>
                        Secure Stripe checkout · Cancel anytime
                      </span>
                    </div>
                    <p className="mt-3 text-center text-[11px] leading-relaxed text-[#705e66]">
                      {monthly
                        ? "$9 billed monthly. Renews automatically until canceled."
                        : "$60 billed once per year. Renews automatically until canceled."}
                    </p>
                  </>
                ) : (
                  <Alert className="border-white/10 bg-white/[0.04] text-[#f7ede8]">
                    <CircleAlert className="size-4" />
                    <AlertTitle>You already have SaveIt Pro</AlertTitle>
                    <AlertDescription className="text-[#a89099]">
                      Manage or cancel your subscription from the{" "}
                      <a href="/billing">billing portal</a>.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-[#705e66]">
              Pro follows you on every signed-in device.
            </p>
          </aside>

          <section className="border-t border-white/[0.08] pt-6 [grid-area:benefits] sm:pt-8">
            <p className="mb-5 text-xs font-semibold tracking-[0.16em] text-[#8f7982] uppercase">
              More saving. Less searching.
            </p>
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-7">
              {PRO_BENEFITS.map(({ title, description, Icon }) => (
                <div key={title} className="flex gap-3.5">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[#ff8f70]/20 bg-[#ff8f70]/10 text-[#ff9d82]">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-[#f7ede8]">
                      {title}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-[#8f7982]">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
