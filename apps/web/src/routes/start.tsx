import { ImportForm } from "@/features/imports/import-form";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { APP_LINKS } from "@/lib/app-links";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { useSession } from "@/lib/auth-client";
import { useAsyncTask } from "@/lib/use-async-task";
import { api } from "@convex/_generated/api";
import type { OnboardingInterest } from "@convex/bookmarks/onboarding";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useAction, useMutation } from "convex/react";
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  Code2,
  Gem,
  MessageSquare,
  Newspaper,
  Palette,
  PlayCircle,
  Sparkles,
  Twitter,
  UtensilsCrossed,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/start")({
  component: StartPage,
});

const STEPS = ["Welcome", "You", "Import", "Plan"] as const;

type ImportSummary = {
  attemptedUrls: number;
  createdBookmarks: number;
  failedUrls: number;
  notAttemptedUrls: number;
  totalUrls: number;
};

const INTERESTS: {
  key: OnboardingInterest;
  label: string;
  icon: typeof Newspaper;
}[] = [
  { key: "articles", label: "Articles", icon: Newspaper },
  { key: "videos", label: "Videos", icon: PlayCircle },
  { key: "threads", label: "X threads", icon: Twitter },
  { key: "recipes", label: "Recipes", icon: UtensilsCrossed },
  { key: "design", label: "Design", icon: Palette },
  { key: "dev", label: "Dev tools", icon: Code2 },
];

function StartPage() {
  const session = useSession();
  const navigate = useNavigate();
  const completeOnboarding = useMutation(
    api.users.mutations.completeOnboarding,
  );
  const createCheckout = useAction(api.stripe.actions.createCheckout);
  const flowState = useAuthedQuery(
    api.users.queries.getOnboardingFlowState,
    session.data?.user ? {} : "skip",
  );

  const [step, setStep] = useState(0);
  const [interest, setInterest] = useState<OnboardingInterest>("articles");
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(
    null,
  );

  // Auth guard — this route requires a session.
  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      void navigate({ to: "/signin", search: { redirectUrl: "/start" } });
    }
  }, [navigate, session.data?.user, session.isPending]);

  const finishTask = useAsyncTask(
    async (params: {
      offerChoice?: "free" | "upgrade";
      path: "empty" | "import";
    }) => {
      await completeOnboarding({
        interest,
        ...(params.offerChoice ? { offerChoice: params.offerChoice } : {}),
      });
      // Routing now uses the reactive Convex flow snapshot. Refresh the
      // Better Auth session opportunistically without turning a successful
      // completion into an error if the refresh transport fails.
      void session.refetch().catch(() => undefined);
      return params;
    },
    {
      onSuccess: (params) => {
        trackAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
          offer_choice: params.offerChoice ?? "not_shown",
          path: params.path,
        });
        void navigate({ to: APP_LINKS.app });
      },
      onError: () => toast.error("We couldn't finish setup. Please try again."),
    },
  );

  const upgradeTask = useAsyncTask(
    async (path: "empty" | "import") => {
      const checkout = await createCheckout({
        annual: true,
        cancelUrl: "/app",
        plan: "pro",
        successUrl: "/upgrade/success",
      });
      await completeOnboarding({ interest, offerChoice: "upgrade" });
      void session.refetch().catch(() => undefined);
      return { checkoutUrl: checkout.url, path };
    },
    {
      onSuccess: ({ checkoutUrl, path }) => {
        trackAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
          offer_choice: "upgrade",
          path,
        });
        trackAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_CHECKOUT_STARTED, {
          billing_interval: "yearly",
          surface: "onboarding",
        });
        window.location.assign(checkoutUrl);
      },
      onError: () =>
        toast.error(
          "We couldn't open checkout. Try again or continue with Free.",
        ),
    },
  );

  useEffect(() => {
    if (
      !session.isPending &&
      session.data?.user &&
      flowState &&
      !flowState.needsOnboarding &&
      !finishTask.isPending &&
      !upgradeTask.isPending
    ) {
      void navigate({ to: APP_LINKS.app, replace: true });
    }
  }, [
    finishTask.isPending,
    flowState,
    navigate,
    session.data?.user,
    session.isPending,
    upgradeTask.isPending,
  ]);

  const goToStep = (next: number) => setStep(Math.max(0, Math.min(3, next)));

  const handleImportSuccess = (data: ImportSummary) => {
    setImportSummary(data);
    goToStep(3);
  };

  const path = importSummary ? "import" : "empty";
  const isBusy = finishTask.isPending || upgradeTask.isPending;

  if (
    session.isPending ||
    !session.data?.user ||
    !flowState ||
    !flowState.needsOnboarding
  ) {
    return <OnboardingRouteLoading />;
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <img
            src="/icon.png"
            alt=""
            className="size-8 rounded-lg object-cover"
          />
          <span className="font-semibold tracking-tight">SaveIt.now</span>
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => goToStep(3)}
          disabled={isBusy || step === 3}
        >
          Skip setup
        </Button>
      </header>

      {/* Progress */}
      <div className="mx-auto w-full max-w-xl px-5 pt-2 sm:px-0">
        <Stepper step={step} />
      </div>

      {/* Step content */}
      <div className="flex flex-1 items-start justify-center px-5 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {step === 0 && <WelcomeStep onNext={() => goToStep(1)} />}
              {step === 1 && (
                <PersonalizeStep
                  selected={interest}
                  onSelect={setInterest}
                  onNext={() => goToStep(2)}
                  onBack={() => goToStep(0)}
                />
              )}
              {step === 2 && (
                <ImportStep
                  onSuccess={handleImportSuccess}
                  onSkip={() => goToStep(3)}
                  onBack={() => goToStep(1)}
                />
              )}
              {step === 3 && (
                <PlanStep
                  effectivePlan={flowState.effectivePlan}
                  importSummary={importSummary}
                  isBusy={isBusy}
                  shouldShowUpgradeOffer={flowState.shouldShowUpgradeOffer}
                  onContinueFree={() =>
                    void finishTask.run({ offerChoice: "free", path })
                  }
                  onOpenLibrary={() => void finishTask.run({ path })}
                  onUpgrade={() => void upgradeTask.run(path)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: state === "todo" ? "0%" : "100%" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span
              className={cn(
                "text-[11px] font-medium transition-colors",
                state === "todo"
                  ? "text-muted-foreground/60"
                  : "text-foreground",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OnboardingRouteLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <p className="text-sm text-muted-foreground">Preparing your setup...</p>
    </main>
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="text-pretty text-base leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const features = [
    {
      icon: BookmarkCheck,
      title: "Save anything",
      description: "Articles, videos, tweets — any link, in one place.",
    },
    {
      icon: Sparkles,
      title: "AI does the filing",
      description: "Every bookmark is auto-summarized and tagged for you.",
    },
    {
      icon: MessageSquare,
      title: "Ask your library",
      description: "Search everything you saved in plain words.",
    },
  ];

  return (
    <div className="space-y-8">
      <StepHeading
        eyebrow="Welcome to SaveIt.now 🎉"
        title="Let's set up your second brain."
        description="Three quick choices and your library starts working for you. This takes about a minute."
      />

      <div className="grid gap-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex size-10 flex-none items-center justify-center rounded-lg bg-primary/10">
              <f.icon className="size-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="font-medium leading-tight">{f.title}</p>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full sm:w-auto" onClick={onNext}>
        Get started
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function PersonalizeStep({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: OnboardingInterest;
  onSelect: (key: OnboardingInterest) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-8">
      <StepHeading
        eyebrow="Step 1 of 3"
        title="What do you save most?"
        description="Pick one — we'll drop a relevant example in your library so it's never empty."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {INTERESTS.map((item) => {
          const isSelected = selected === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:border-muted-foreground/40",
              )}
            >
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <item.icon className="size-5" />
              </div>
              <span className="font-medium">{item.label}</span>
              {isSelected && (
                <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" onClick={onNext}>
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ImportStep({
  onSuccess,
  onSkip,
  onBack,
}: {
  onSuccess: (data: ImportSummary) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow="Step 2 of 3"
        title="Bring your bookmarks with you."
        description="Paste your links, or drop your browser's bookmark export — we'll import the links we can and report exactly what happened."
      />

      <ImportForm onSuccess={onSuccess} />

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={onSkip}
        >
          I&apos;ll do this later
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function PlanStep({
  effectivePlan,
  importSummary,
  isBusy,
  onContinueFree,
  onOpenLibrary,
  onUpgrade,
  shouldShowUpgradeOffer,
}: {
  effectivePlan: "free" | "pro";
  importSummary: ImportSummary | null;
  isBusy: boolean;
  onContinueFree: () => void;
  onOpenLibrary: () => void;
  onUpgrade: () => void;
  shouldShowUpgradeOffer: boolean;
}) {
  const isPro = effectivePlan === "pro";
  const importMessage = getImportMessage(importSummary);

  return (
    <div className="space-y-7">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="flex size-14 items-center justify-center rounded-2xl bg-primary/10"
      >
        {isPro ? (
          <Gem className="size-7 text-primary" />
        ) : (
          <BookmarkCheck className="size-7 text-primary" />
        )}
      </motion.div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-primary">Step 3 of 3</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {isPro
            ? "Your Pro workspace is ready."
            : "Choose how you want to start."}
        </h1>
        <p className="text-pretty text-base leading-7 text-muted-foreground">
          {importMessage}
        </p>
      </div>

      {isPro || !shouldShowUpgradeOffer ? (
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={onOpenLibrary}
          disabled={isBusy}
        >
          {isBusy ? "Opening your library..." : "Open my library"}
          <ArrowRight className="size-4" />
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-card p-5 shadow-sm sm:p-6">
            <div className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              Pro
            </div>
            <div className="space-y-5 pr-14">
              <div>
                <h2 className="text-xl font-semibold">SaveIt.pro</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep a larger library and unlock exports, API access, and more
                  AI usage.
                </p>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl font-semibold">$5</span>
                <span className="text-sm text-muted-foreground">/month</span>
                <span className="text-xs text-muted-foreground">
                  $60 billed annually
                </span>
              </div>
              <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  Up to 50,000 bookmarks
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  Export and API access
                </li>
              </ul>
            </div>
            <Button
              size="lg"
              className="mt-6 w-full"
              onClick={onUpgrade}
              disabled={isBusy}
            >
              {isBusy ? "Opening secure checkout..." : "Upgrade to Pro"}
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={onContinueFree}
            disabled={isBusy}
          >
            Continue with Free — 20 bookmarks
          </Button>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            No credit card required for Free. You can upgrade later.
          </p>
        </div>
      )}
    </div>
  );
}

function getImportMessage(summary: ImportSummary | null) {
  if (!summary) {
    return "Your library will start with one example bookmark. You can save your own links as soon as setup is complete.";
  }

  if (summary.createdBookmarks === 0) {
    return `We tried ${summary.attemptedUrls} of ${summary.totalUrls} ${
      summary.totalUrls === 1 ? "link" : "links"
    }, but none were added.${
      summary.notAttemptedUrls > 0
        ? ` ${summary.notAttemptedUrls} remaining ${
            summary.notAttemptedUrls === 1 ? "link was" : "links were"
          } not attempted after the import stopped.`
        : ""
    }`;
  }

  const added = `${summary.createdBookmarks} bookmark${
    summary.createdBookmarks === 1 ? "" : "s"
  }`;
  if (summary.failedUrls > 0 || summary.notAttemptedUrls > 0) {
    const failed =
      summary.failedUrls > 0
        ? ` ${summary.failedUrls} attempted ${
            summary.failedUrls === 1 ? "link" : "links"
          } could not be added.`
        : "";
    const notAttempted =
      summary.notAttemptedUrls > 0
        ? ` ${summary.notAttemptedUrls} remaining ${
            summary.notAttemptedUrls === 1 ? "link was" : "links were"
          } not attempted after the import stopped.`
        : "";
    return `We added ${added}.${failed}${notAttempted}`;
  }

  return `We added ${added}. SaveIt is summarizing and tagging them now.`;
}
