"use client";

import { DialogManagerRenderer } from "@/features/dialog-manager/dialog-manager-renderer";
import { PostHogProvider } from "@/features/posthog/pohsthog-provider";
import { useSession } from "@/lib/auth-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useEffect } from "react";
import { HEYO } from "@heyo.so/js";
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

  useEffect(() => {
    if (!session.data?.user) {
      return;
    }

    HEYO.identify({
      userId: session.data.user.id,
      name: session.data.user.name || "Anonymous",
      email: session.data.user.email || undefined,
    });
  }, [session.data?.user]);

  useEffect(() => {
    void HEYO.init({
      projectId: "68ba5e182a237aaa4010661c",
      hidden: false,
    });
  }, []);

  return null;
};
