import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import SignInPage from "@/features/auth/signin-page";
import { LANDING_HEAD_LINKS } from "@/features/marketing/landing/theme";

type SignInSearch = {
  redirectUrl?: string;
  email?: string;
  intent?: "signin" | "signup";
  step?: "email" | "otp";
};

export const Route = createFileRoute("/signin")({
  head: () => ({
    links: LANDING_HEAD_LINKS,
  }),
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    redirectUrl:
      typeof search.redirectUrl === "string" ? search.redirectUrl : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
    intent: search.intent === "signup" ? "signup" : "signin",
    step: search.step === "otp" ? "otp" : "email",
  }),
  component: SignInRoute,
});

function SignInRoute() {
  return (
    <ClientOnly>
      <SignInPage />
    </ClientOnly>
  );
}
