import { useSession } from "@/lib/auth-client";
import { changelogEntries } from "@/lib/changelog/changelog-data";
import { upfetch } from "@/lib/up-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

export function useChangelogNotification() {
  const session = useSession();
  const queryClient = useQueryClient();

  const { data: shouldShow, isLoading } = useQuery({
    queryKey: ["changelog-notification", session.data?.user?.id],
    queryFn: async () => {
      if (!session.data?.user?.id) return false;

      const latestEntry = changelogEntries[0];
      if (!latestEntry) return false;

      const response = await upfetch("/api/changelog/check-dismissed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: latestEntry.version }),
        schema: z.object({
          isDismissed: z.boolean(),
        }),
      });

      return !response.isDismissed;
    },
    enabled: !!session.data?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const dismissMutation = useMutation({
    mutationFn: async (version: string) => {
      const response = await upfetch("/api/changelog/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
        schema: z.object({
          success: z.boolean(),
        }),
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog-notification"] });
    },
  });

  const dismissNotification = (version: string) => {
    if (!session.data?.user?.id) return;
    dismissMutation.mutate(version);
  };

  const latestEntry = changelogEntries[0];

  return {
    shouldShow: shouldShow ?? false,
    latestEntry,
    dismissNotification,
    isLoading,
    isDismissing: dismissMutation.isPending,
  };
}
