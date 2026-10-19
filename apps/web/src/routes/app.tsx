import {
  ClientOnly,
  Outlet,
  createFileRoute,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { BookmarksPage } from "@/features/app/bookmarks-page";
import { AppShell } from "@/features/app/shell/app-shell";
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

  return <AppShell>{isAppIndex ? <BookmarksPage /> : <Outlet />}</AppShell>;
}

function AppRouteLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your bookmark library"
      className="flex min-h-dvh bg-background text-foreground"
    >
      <span className="sr-only">Loading your bookmark library…</span>
      <div
        aria-hidden="true"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-3 md:flex"
      >
        <div className="flex h-10 items-center gap-2">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-8 flex-1 rounded-lg" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[26px] rounded-md" />
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-[26px] w-4/5 rounded-md" />
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-1 py-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      </div>

      <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-13 items-center gap-2 border-b border-border px-2 md:hidden">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
