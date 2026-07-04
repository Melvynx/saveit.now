"use client";

import { authClient, useSession } from "@/lib/auth-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

type MobileLoginSearch = {
  token?: string;
  redirect?: string;
};

const getSafeRedirectPath = (redirect?: string) => {
  if (!redirect?.startsWith("/") || redirect.startsWith("//")) {
    return "/app";
  }

  try {
    const url = new URL(redirect, "https://saveit.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/app";
  }
};

export const Route = createFileRoute("/auth/mobile-login")({
  validateSearch: (search: Record<string, unknown>): MobileLoginSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: MobileLoginRoute,
});

function MobileLoginRoute() {
  const search = Route.useSearch();
  const session = useSession();
  const hasStartedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const redirectPath = useMemo(
    () => getSafeRedirectPath(search.redirect),
    [search.redirect],
  );

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      if (!search.token) {
        setError("Missing sign-in token.");
        return;
      }

      const result = await authClient.oneTimeToken.verify({
        token: search.token,
      });

      if (cancelled) return;

      if (result.error) {
        setError(result.error.message ?? "This sign-in link is invalid.");
        return;
      }

      await session.refetch();

      if (cancelled) return;
      window.history.replaceState(null, "", redirectPath);
      window.location.replace(redirectPath);
    };

    verify().catch(() => {
      if (!cancelled) {
        setError("This sign-in link is invalid.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [redirectPath, search.token, session]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm space-y-4 text-center">
        {error ? (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Could not sign you in</h1>
              <p className="text-sm leading-6 text-muted-foreground">{error}</p>
            </div>
            <Link
              to="/signin"
              search={{ redirectUrl: redirectPath }}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Log in
            </Link>
          </>
        ) : (
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Signing you in...</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              This will only take a moment.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
