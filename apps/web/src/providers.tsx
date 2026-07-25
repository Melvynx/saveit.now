import { DialogManagerRenderer } from "@/features/dialog-manager/dialog-manager-renderer";
import { ThemeProvider } from "@/features/dark-mode/theme-provider";
import { authClient, useSession } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { getConvexUrl } from "@/lib/convex-url";
import { api } from "@convex/_generated/api";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ClientOnly } from "@tanstack/react-router";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { ConvexReactClient, useConvex, useConvexAuth } from "convex/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { useTchao } from "tchao/react";
import type { VisitorInfo } from "tchao/react";
import { useEffect, useState } from "react";

const convexClient = new ConvexReactClient(getConvexUrl());

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    /* ConvexBetterAuthProvider supplies the Convex client + exchanges the
       Better Auth session for a Convex token. Keep it OUTSIDE the query provider. */
    <ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
      <ThemeProvider defaultTheme="system">
        <NuqsAdapter>
          <TooltipProvider>
            {children}
            <Toaster />
            <DialogManagerRenderer />
            <UserPlanSync />
            <ClientOnly>
              <ChatSnippet />
            </ClientOnly>
          </TooltipProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </ConvexBetterAuthProvider>
  );
};

import { Toaster } from "@workspace/ui/components/sonner";
import { TooltipProvider } from "@workspace/ui/components/tooltip";

const UserPlanSync = () => {
  const session = useSession();
  const userId = session.data?.user?.id;

  const plan = useAuthedQuery(
    api.users.queries.getLimits,
    userId ? {} : "skip",
  );

  useEffect(() => {
    if (!session.isPending && !userId) {
      useUserPlan.setState({
        name: "free",
        limits: {
          bookmarks: 20,
          monthlyBookmarkRuns: 20,
          monthlyChatQueries: 10,
          canExport: 0,
          apiAccess: 0,
        },
        isLoading: false,
      });
      return;
    }

    if (!plan) return;

    useUserPlan.setState({
      name: plan.plan,
      limits: plan.limits,
      isLoading: false,
    });
  }, [plan, session.isPending, userId]);

  return null;
};

export const ChatSnippet = () => {
  const session = useSession();
  const user = session.data?.user;
  const impersonatedBy = session.data?.session.impersonatedBy;

  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const [userHash, setUserHash] = useState<string | null>();

  const { isReady, identify } = useTchao({
    websiteId: "kd7ctwnpfvvrjxegjtmz7t3q018061ad",
    impersonate: Boolean(impersonatedBy),
  });

  // Signed identity for Tchao identity verification. One-shot fetch (the
  // hash is stable per email); on failure we fall back to unsigned identify.
  // https://tchao.app/docs/identity-verification
  useEffect(() => {
    setUserHash(undefined);
    if (!user?.email || !isAuthenticated || impersonatedBy) return;

    let cancelled = false;
    convex
      .query(api.tchao.getUserHash, {})
      .then((hash) => {
        if (!cancelled) setUserHash(hash);
      })
      .catch(() => {
        if (!cancelled) setUserHash(null);
      });
    return () => {
      cancelled = true;
    };
  }, [convex, user?.email, isAuthenticated, impersonatedBy]);

  const userRole = (user as { role?: string } | undefined)?.role ?? "user";
  const userEmail = user?.email;
  const userName = user?.name;
  const userImage = user?.image;
  const userId = user?.id;

  useEffect(() => {
    if (!isReady || impersonatedBy) return;

    if (!userEmail) {
      identify({ name: "Anonymous", metadata: { role: "user" } });
      return;
    }

    // Wait for the signed hash before identifying a logged-in user. A null
    // hash means signing is unavailable: identify unsigned (legacy mode).
    if (userHash === undefined) return;

    const info: SignedVisitorInfo = {
      email: userEmail,
      name: userName ?? "Anonymous",
      avatar: userImage ?? undefined,
      userHash: userHash ?? undefined,
      metadata: {
        userId: userId,
        role: userRole,
      },
    };
    identify(info);
  }, [
    isReady,
    identify,
    userEmail,
    userName,
    userImage,
    userId,
    userRole,
    userHash,
    impersonatedBy,
  ]);

  return null;
};

type SignedVisitorInfo = VisitorInfo & { userHash?: string };
