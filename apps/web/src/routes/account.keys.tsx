import { ApiKeyList, type ApiKey } from "@/features/account/api-keys/api-key-list";
import { CreateApiKeyForm } from "@/features/account/api-keys/create-api-key-form";
import { APP_LINKS } from "@/lib/app-links";
import { authClient, useSession } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/account/keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const session = useSession();
  const plan = useUserPlan();
  const userId = session.data?.user?.id;
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);

  const loadKeys = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!userId || plan.isLoading) return;
      setIsLoadingKeys(true);
      if (plan.limits.apiAccess === 0) {
        setApiKeys([]);
        setIsLoadingKeys(false);
        return;
      }

      const { data, error } = await authClient.apiKey.list();
      if (isCancelled()) return;
      if (error) {
        setApiKeys([]);
        setIsLoadingKeys(false);
        return;
      }
      const list = Array.isArray(data)
        ? data
        : ((data as { apiKeys?: unknown[] } | null)?.apiKeys ?? []);
      setApiKeys(list as unknown as ApiKey[]);
      setIsLoadingKeys(false);
    },
    [plan.isLoading, plan.limits.apiAccess, userId],
  );

  useEffect(() => {
    let cancelled = false;
    void loadKeys(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadKeys]);

  if (plan.isLoading || isLoadingKeys) {
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
        apiKeys={apiKeys}
        onChanged={() => void loadKeys()}
        action={<CreateApiKeyForm onCreated={() => void loadKeys()} />}
      />
    </div>
  );
}
