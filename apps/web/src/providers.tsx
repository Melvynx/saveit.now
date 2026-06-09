import { DialogManagerRenderer } from "@/features/dialog-manager/dialog-manager-renderer";
import { ThemeProvider } from "@/features/dark-mode/theme-provider";
import { PostHogProvider } from "@/features/posthog/pohsthog-provider";
import { authClient, useSession } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { api } from "@convex/_generated/api";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient, convexQuery } from "@convex-dev/react-query";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { TchaoProvider } from "tchao/react";
import { useEffect } from "react";

const convexUrl =
  import.meta.env.VITE_CONVEX_URL ?? "https://tough-chameleon-916.convex.cloud";

const convexQueryClient = new ConvexQueryClient(convexUrl);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});

convexQueryClient.connect(queryClient);

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <PostHogProvider>
      {/* ConvexBetterAuthProvider supplies the Convex client + exchanges the
          Better Auth session for a Convex token. Keep it OUTSIDE the query provider. */}
      <ConvexBetterAuthProvider
        client={convexQueryClient.convexClient}
        authClient={authClient}
      >
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system">
            <NuqsAdapter>
              {children}
              <Toaster />
              <DialogManagerRenderer />
              <UserPlanSync />
              <ClientOnly>
                <ChatSnippet />
              </ClientOnly>
            </NuqsAdapter>
          </ThemeProvider>
        </QueryClientProvider>
      </ConvexBetterAuthProvider>
    </PostHogProvider>
  );
};

import { Toaster } from "@workspace/ui/components/sonner";
import { TooltipProvider } from "@workspace/ui/components/tooltip";

const UserPlanSync = () => {
  const session = useSession();
  const userId = session.data?.user?.id;

  const planQuery = useQuery({
    ...convexQuery(api.users.queries.getLimits, {}),
    enabled: Boolean(userId),
  });

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

    if (!planQuery.data) return;

    useUserPlan.setState({
      name: planQuery.data.plan,
      limits: planQuery.data.limits,
      isLoading: false,
    });
  }, [planQuery.data, session.isPending, userId]);

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
