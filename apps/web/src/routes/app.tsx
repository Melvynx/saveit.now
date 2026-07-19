import {
  ClientOnly,
  Outlet,
  createFileRoute,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { BookmarksPage } from "@/features/app/bookmarks-page";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useSession } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import { useEffect } from "react";

export const Route = createFileRoute("/app")({
  component: AppRoute,
});

function AppRoute() {
  return (
    <ClientOnly fallback={<AppRouteLoading />}>
      <GuardedAppRoute />
    </ClientOnly>
  );
}

function GuardedAppRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const flowState = useAuthedQuery(
    api.users.queries.getOnboardingFlowState,
    session.data?.user ? {} : "skip",
  );
  const isAppPath =
    location.pathname === "/app" || location.pathname.startsWith("/app/");
  const isAppIndex = location.pathname === "/app";
  const signInRedirectUrl = isAppPath ? location.href : "/app";

  useEffect(() => {
    if (session.isPending) return;

    if (!session.data?.user) {
      // TanStack can keep this route mounted for one render after navigation.
      // Never turn the destination /signin URL into its own redirect target.
      if (!isAppPath) return;

      void navigate({
        to: "/signin",
        search: { redirectUrl: signInRedirectUrl },
        replace: true,
      });
      return;
    }

    if (flowState?.needsOnboarding) {
      void navigate({ to: "/start", replace: true });
    }
  }, [
    flowState?.needsOnboarding,
    isAppPath,
    navigate,
    session.data?.user,
    session.isPending,
    signInRedirectUrl,
  ]);

  if (
    session.isPending ||
    !session.data?.user ||
    !flowState ||
    flowState.needsOnboarding
  ) {
    return <AppRouteLoading />;
  }

  if (!isAppIndex) {
    return <Outlet />;
  }

  return <BookmarksPage />;
}

function AppRouteLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <p className="text-sm text-muted-foreground">Preparing your library…</p>
    </main>
  );
}
