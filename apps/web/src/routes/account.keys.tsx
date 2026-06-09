import { ApiKeyList, type ApiKey } from "@/features/account/api-keys/api-key-list";
import { CreateApiKeyForm } from "@/features/account/api-keys/create-api-key-form";
import { APP_LINKS } from "@/lib/app-links";
import { authClient, useSession } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";

export const Route = createFileRoute("/account/keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const session = useSession();
  const plan = useUserPlan();
  const userId = session.data?.user?.id;

  const apiKeysQuery = useQuery({
    queryKey: ["api-keys", userId],
    queryFn: async () => {
      if (plan.limits.apiAccess === 0) return [] as ApiKey[];
      const { data, error } = await authClient.apiKey.list();
      if (error) throw new Error(error.message ?? "Failed to load API keys");
      const list = Array.isArray(data)
        ? data
        : ((data as { apiKeys?: unknown[] } | null)?.apiKeys ?? []);
      return list as unknown as ApiKey[];
    },
    enabled: Boolean(userId) && !plan.isLoading,
  });

  if (plan.isLoading || apiKeysQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (plan.limits.apiAccess === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">API keys</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            API access is only available for Premium users. Upgrade to unlock
            API keys and programmatic access to SaveIt.now.
          </p>
        </div>
        <Button className="w-fit" asChild>
          <a href={APP_LINKS.upgrade}>Upgrade to Premium</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ApiKeyList
        apiKeys={apiKeysQuery.data ?? []}
        action={<CreateApiKeyForm />}
      />
    </div>
  );
}
