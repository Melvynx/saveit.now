import { OtpForm } from "@/components/better-auth-otp";
import { completeOtpSignIn } from "@/features/auth/complete-otp-sign-in";
import { getSafeInternalRedirectUrl } from "@/features/auth/safe-internal-redirect";
import { SignInWith } from "@/features/auth/sign-in-with";
import { LandingStyle } from "@/features/marketing/landing/theme";
import { authClient, useSession } from "@/lib/auth-client";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Suspense } from "react";

const authVisualImage = "/images/landing/v2/home.webp";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  },
};

function SignInPageContent() {
  const navigate = useNavigate();
  const session = useSession();
  const search = useSearch({ strict: false }) as {
    redirectUrl?: string;
    email?: string;
    intent?: "signin" | "signup";
    step?: "email" | "otp";
  };
  const isSignup = search.intent === "signup";
  const initialStep = search.step === "otp" && search.email ? "otp" : "email";
  const redirectUrl = getSafeInternalRedirectUrl(search.redirectUrl);

  return (
    <main className="landing-dusk dark grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <LandingStyle />
      <section className="relative hidden min-h-screen bg-[#120a10] p-4 lg:block lg:p-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="relative flex h-full min-h-[calc(100vh-2.5rem)] flex-col justify-between overflow-hidden rounded-[2rem] border border-white/[0.08] p-10 xl:p-14"
        >
          <motion.img
            src={authVisualImage}
            alt=""
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease: [0.25, 0.4, 0.25, 1] }}
            className="absolute inset-0 size-full object-cover object-[center_35%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120a10]/85 via-[#120a10]/15 to-[#120a10]/40" />
          <div className="landing-noise absolute inset-0" />

          <a
            href="/"
            className="landing-display relative z-10 w-fit text-xl tracking-tight text-[#f7ede8] [text-shadow:0_1px_20px_rgba(18,10,16,0.7)]"
          >
            SaveIt<span className="text-[#ff8f70]">.now</span>
          </a>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.35,
              ease: [0.25, 0.4, 0.25, 1],
            }}
            className="relative z-10 max-w-md space-y-4"
          >
            <p className="landing-display text-4xl leading-[1.1] tracking-tight text-white [text-shadow:0_2px_30px_rgba(18,10,16,0.6)] text-balance xl:text-5xl">
              Come <em>home</em> to your bookmarks.
            </p>
            <p className="max-w-sm text-pretty text-base leading-7 text-[#f3dfd6] [text-shadow:0_1px_20px_rgba(18,10,16,0.7)]">
              Everything you've ever saved, one question away. The agent kept
              the lights on while you were gone.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <section className="flex min-h-screen flex-col bg-[#120a10]">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10 lg:py-8">
          <a
            href="/"
            className="landing-display text-lg tracking-tight text-[#f7ede8] lg:hidden"
          >
            SaveIt<span className="text-[#ff8f70]">.now</span>
          </a>
          <a
            href="/"
            className="ml-auto text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back home
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-4 sm:px-8 lg:px-10 lg:py-12">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-[420px] space-y-8"
          >
            <motion.div variants={itemVariants} className="space-y-3">
              <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-primary">
                {isSignup ? "Start free" : "Welcome back"}
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl leading-tight text-foreground text-balance sm:text-4xl">
                  {isSignup ? (
                    <>
                      Give your links a{" "}
                      <em className="landing-display landing-gradient-text">home</em>.
                    </>
                  ) : (
                    <>
                      Welcome back{" "}
                      <em className="landing-display landing-gradient-text">home</em>.
                    </>
                  )}
                </h1>
                <p className="text-sm leading-6 text-muted-foreground text-pretty">
                  {isSignup
                    ? "Start with 20 bookmarks. No credit card required."
                    : "Use your email code or a connected account."}
                </p>
              </div>
            </motion.div>

            <div className="landing-press space-y-6">
              <motion.div variants={itemVariants}>
                <OtpForm
                defaultEmail={search.email}
                initialStep={initialStep}
                submitLabel={
                  isSignup ? "Continue with email" : "Send code to sign in"
                }
                submittingLabel="Sending code..."
                variant="split"
                onStepChange={({ email, step }) => {
                  void navigate({
                    to: "/signin",
                    search: {
                      redirectUrl:
                        redirectUrl === "/app" ? undefined : redirectUrl,
                      email: step === "otp" ? email : undefined,
                      intent: isSignup ? "signup" : "signin",
                      step,
                    },
                    replace: true,
                  });
                }}
                sendOtp={async (email) => {
                  const result = await authClient.emailOtp.sendVerificationOtp({
                    email,
                    type: "sign-in",
                  });
                  if (result.error) throw new Error(result.error.message);
                }}
                verifyOtp={async (email, otp) => {
                  const result = await authClient.signIn.emailOtp({
                    email,
                    otp,
                  });
                  if (result.error) throw new Error(result.error.message);

                  return result.data.user;
                }}
                onSuccess={() => {
                  completeOtpSignIn({
                    refreshSession: () => session.refetch(),
                    redirectUrl,
                  });
                }}
                  onError={(error) => toast.error(error)}
                />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex items-center gap-6 text-sm text-muted-foreground"
              >
                <div className="h-px flex-1 bg-border" />
                <span>or</span>
                <div className="h-px flex-1 bg-border" />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex flex-col items-center gap-2"
              >
                <SignInWith
                  className="w-full"
                  type="github"
                  variant="monochrome"
                  callbackURL={redirectUrl}
                  buttonProps={{}}
                  intent={isSignup ? "signup" : "signin"}
                />
                <SignInWith
                  className="w-full"
                  type="google"
                  variant="monochrome"
                  callbackURL={redirectUrl}
                  buttonProps={{}}
                  intent={isSignup ? "signup" : "signin"}
                />
              </motion.div>

              <motion.p
                variants={itemVariants}
                className="text-center text-sm text-muted-foreground"
              >
                {isSignup ? "Already have an account?" : "New to SaveIt.now?"}{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4"
                  onClick={() =>
                    void navigate({
                      to: "/signin",
                      search: {
                        redirectUrl:
                          redirectUrl === "/app" ? undefined : redirectUrl,
                        intent: isSignup ? "signin" : "signup",
                        step: "email",
                      },
                      replace: true,
                    })
                  }
                >
                  {isSignup ? "Sign in" : "Create a free account"}
                </button>
              </motion.p>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

function SignInPageSkeleton() {
  return (
    <main className="landing-dusk dark grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <LandingStyle />
      <section className="relative hidden min-h-screen overflow-hidden bg-[#120a10] lg:block" />
      <section className="flex min-h-screen flex-col bg-card">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10 lg:py-8">
          <div className="h-8 w-32 animate-pulse rounded bg-muted lg:hidden" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded bg-muted" />
        </header>
        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-4 sm:px-8 lg:px-10 lg:py-12">
          <div className="w-full max-w-[420px] space-y-8">
            <div className="space-y-3">
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-6">
              <div className="h-24 animate-pulse rounded bg-muted" />
              <div className="h-px bg-muted" />
              <div className="space-y-2">
                <div className="h-11 animate-pulse rounded bg-muted" />
                <div className="h-11 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageSkeleton />}>
      <SignInPageContent />
    </Suspense>
  );
}
