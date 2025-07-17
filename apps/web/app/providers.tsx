"use client";

import { DialogManagerRenderer } from "@/features/dialog-manager/dialog-manager-renderer";
import { PostHogProvider } from "@/features/posthog/pohsthog-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
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
          </NuqsAdapter>
        </ThemeProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
};
