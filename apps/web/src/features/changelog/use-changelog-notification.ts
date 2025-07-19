import { useQuery } from "@tanstack/react-query";
import { changelogEntries } from "@/lib/changelog/changelog-data";
import { authClient } from "@/lib/auth-client";

export function useChangelogNotification() {
  const session = authClient.useSession();
  
  const { data: shouldShow, isLoading } = useQuery({
    queryKey: ["changelog-notification", session.data?.user?.id],
    queryFn: async () => {
      if (!session.data?.user?.id) return false;
      
      const latestEntry = changelogEntries[0];
      if (!latestEntry) return false;
      
      const response = await fetch("/api/changelog/check-dismissed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: latestEntry.version }),
      });
      
      if (!response.ok) return false;
      
      const { isDismissed } = await response.json();
      return !isDismissed;
    },
    enabled: !!session.data?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const dismissNotification = async (version: string) => {
    if (!session.data?.user?.id) return;
    
    await fetch("/api/changelog/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
  };

  const latestEntry = changelogEntries[0];

  return {
    shouldShow: shouldShow ?? false,
    latestEntry,
    dismissNotification,
    isLoading,
  };
}