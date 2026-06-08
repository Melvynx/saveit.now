import { OtpForm } from "@/components/better-auth-otp";
import { SignInWith } from "@/features/auth/sign-in-with";
import { authClient, useSession } from "@/lib/auth-client";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Suspense } from "react";

const authVisualImage = "/auth/signin-visual.jpeg";

const getSafeRedirectUrl = (redirectUrl?: string) => {
  if (!redirectUrl?.startsWith("/") || redirectUrl.startsWith("//")) {
    return "/app";
  }

  return redirectUrl;
};

function SignInPageContent() {
  const navigate = useNavigate();
  const session = useSession();
  const search = useSearch({ strict: false }) as {
    redirectUrl?: string;
    email?: string;
    step?: "email" | "otp";
  };
  const initialStep = search.step === "otp" && search.email ? "otp" : "email";
  const redirectUrl = getSafeRedirectUrl(search.redirectUrl);

  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-black lg:block">
        <img
          src={authVisualImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(7,9,15,0.18),rgba(7,9,15,0.82))]" />
        <div className="relative flex h-full min-h-screen flex-col justify-between p-12 text-white xl:p-16">
          <a href="/" className="flex w-fit items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-lg shadow-black/20 backdrop-blur-md">
              <img
                src="/icon.png"
                alt=""
                className="size-7 rounded-md object-cover"
              />
            </span>
            <span className="text-xl font-semibold">SaveIt.now</span>
          </a>

          <div className="max-w-xl space-y-5">
            <p className="text-4xl font-semibold leading-[1.05] text-balance xl:text-5xl">
              SaveIt.now - everything worth keeping, ready when you are.
            </p>
            <p className="max-w-md text-base leading-7 text-white/80">
              Access your bookmark workspace, pick up where you left off, and
              let search bring the right link back fast.
            </p>
          </div>

          <p className="max-w-sm text-sm leading-6 text-white/60">
            Secure sign-in for people who save across articles, videos, posts,
            and tools.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col bg-card">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10 lg:py-8">
          <a href="/" className="flex items-center gap-2 lg:hidden">
            <img
              src="/icon.png"
              alt=""
              className="size-8 rounded-md object-cover"
            />
            <span className="font-semibold">SaveIt.now</span>
          </a>
          <a
            href="/"
            className="ml-auto text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back home
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-4 sm:px-8 lg:px-10 lg:py-12">
          <div className="w-full max-w-[420px] space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">Welcome back</p>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold leading-tight text-foreground text-balance">
                  Sign in to SaveIt.now
                </h1>
                <p className="text-sm leading-6 text-muted-foreground text-pretty">
                  Use your email code or continue with a connected provider.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <OtpForm
                defaultEmail={search.email}
                initialStep={initialStep}
                variant="split"
                onStepChange={({ email, step }) => {
                  void navigate({
                    to: "/signin",
                    search: {
                      redirectUrl:
                        redirectUrl === "/app" ? undefined : redirectUrl,
                      email: step === "otp" ? email : undefined,
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
                  void navigate({ to: redirectUrl });
                  session.refetch();
                }}
                onError={(error) => toast.error(error)}
              />

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="flex flex-col items-center gap-2">
                <SignInWith
                  className="w-full"
                  type="github"
                  variant="monochrome"
                  callbackURL={redirectUrl}
                  buttonProps={{}}
                />
                <SignInWith
                  className="w-full"
                  type="google"
                  variant="monochrome"
                  callbackURL={redirectUrl}
                  buttonProps={{}}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SignInPageSkeleton() {
  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-muted lg:block" />
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
