import { DialogManagerRenderer } from "@/features/dialog-manager/dialog-manager-renderer";
import { ThemeProvider } from "@/features/dark-mode/theme-provider";
import { authClient, useSession } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { getConvexUrl } from "@/lib/convex-url";
import { api } from "@convex/_generated/api";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ClientOnly } from "@tanstack/react-router";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { ConvexReactClient } from "convex/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { TchaoProvider } from "tchao/react";
import { useEffect } from "react";

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

  return (
    <TchaoProvider
      websiteId="kd7ctwnpfvvrjxegjtmz7t3q018061ad"
      visitorEmail={user?.email ?? undefined}
      visitorName={user?.name ?? "Anonymous"}
      visitorAvatar={user?.image ?? undefined}
      visitorId={user?.id}
      visitorRole={(user as { role?: string } | undefined)?.role ?? "user"}
      visitorMetadata={impersonatedBy ? { impersonatedBy } : undefined}
      impersonate={Boolean(impersonatedBy)}
    />
  );
};
