import { ApiKeyList } from "@/features/account/api-keys/api-key-list";
import { CreateApiKeyForm } from "@/features/account/api-keys/create-api-key-form";
import { APP_LINKS } from "@/lib/app-links";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@workspace/ui/components/button";

const getApiKeysData = createServerFn({ method: "GET" }).handler(async () => {
  const [{ auth }, { getUserLimitsOrRedirect }, { getRequestHeaders }] =
    await Promise.all([
      import("@/lib/auth"),
      import("@/lib/auth-session"),
      import("@tanstack/react-start/server"),
    ]);
  const plan = await getUserLimitsOrRedirect();
  const apiKeys =
    plan.limits.apiAccess === 0
      ? []
      : await auth.api.listApiKeys({
          headers: getRequestHeaders(),
        });

  return { plan, apiKeys };
});

export const Route = createFileRoute("/account/keys")({
  loader: () => getApiKeysData(),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { plan, apiKeys } = Route.useLoaderData();

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
      <CreateApiKeyForm />
      <ApiKeyList apiKeys={apiKeys} />
    </div>
  );
}
