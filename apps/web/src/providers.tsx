import { DialogManagerRenderer } from "@/features/dialog-manager/dialog-manager-renderer";
import { ThemeProvider } from "@/features/dark-mode/theme-provider";
import { PostHogProvider } from "@/features/posthog/pohsthog-provider";
import { useUserPlan } from "@/lib/auth/user-plan";
import { useSession } from "@/lib/auth-client";
import { upfetch } from "@/lib/up-fetch";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { ConvexQueryClient } from "@convex-dev/react-query";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { ConvexProvider } from "convex/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { Toaster } from "sonner";
import { TchaoProvider } from "tchao/react";
import { useEffect } from "react";
import { z } from "zod";

const convexQueryClient = new ConvexQueryClient(
  import.meta.env.VITE_CONVEX_URL,
);

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
      <ConvexProvider client={convexQueryClient.convexClient}>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </ConvexProvider>
    </PostHogProvider>
  );
};

const userLimitsSchema = z.object({
  plan: z.enum(["free", "pro"]),
  limits: z.object({
    bookmarks: z.number(),
    monthlyBookmarkRuns: z.number(),
    monthlyChatQueries: z.number(),
    canExport: z.number(),
    apiAccess: z.number(),
  }),
});

const UserPlanSync = () => {
  const session = useSession();
  const userId = session.data?.user?.id;

  const planQuery = useQuery({
    queryKey: ["user", "limits", userId],
    enabled: Boolean(userId),
    queryFn: () =>
      upfetch("/api/user/limits", {
        schema: userLimitsSchema,
      }),
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
      visitorRole={user?.role ?? "user"}
      visitorMetadata={impersonatedBy ? { impersonatedBy } : undefined}
      impersonate={Boolean(impersonatedBy)}
    />
  );
};
