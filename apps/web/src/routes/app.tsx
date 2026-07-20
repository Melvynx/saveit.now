import {
  ClientOnly,
  Outlet,
  createFileRoute,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { BookmarksPage } from "@/features/app/bookmarks-page";
import { ExtensionInstallPrompt } from "@/features/app/extension-install-prompt";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useSession } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import { Skeleton } from "@workspace/ui/components/skeleton";
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

  return (
    <>
      <BookmarksPage />
      <ExtensionInstallPrompt />
    </>
  );
}

function AppRouteLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading your bookmark library"
      className="min-h-dvh bg-background text-foreground"
    >
      <span className="sr-only">Loading your bookmark library…</span>
      <div
        aria-hidden="true"
        className="mx-auto flex w-full flex-col gap-4 px-4 py-4 lg:px-12"
        style={{ maxWidth: 3000 }}
      >
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <div className="flex-1" />
          <div className="hidden items-center gap-2 md:flex">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="size-8" />
          </div>
          <Skeleton className="size-8" />
          <Skeleton className="size-8 rounded-full" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 min-w-[200px] max-w-md flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] place-items-start gap-4 lg:gap-6 [&>*]:w-full">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-md" />
          ))}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-4"
      >
        <Skeleton className="h-14 rounded-2xl border border-border" />
      </div>
    </main>
  );
}
