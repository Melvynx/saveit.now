"use client";

import { DialogManagerRenderer } from "@/features/dialog-manager/dialog-manager-renderer";
import { PostHogProvider } from "@/features/posthog/pohsthog-provider";
import { useSession } from "@/lib/auth-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TchaoProvider } from "tchao/react";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>
            {children}
            <Toaster />
            <DialogManagerRenderer />
            <ChatSnippet />
          </NuqsAdapter>
        </ThemeProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
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
