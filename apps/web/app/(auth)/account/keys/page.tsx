import { MaxWidthContainer } from "@/features/page/page";
import { APP_LINKS } from "@/lib/app-links";
import { getUserLimits } from "@/lib/auth-session";
import { Typography } from "@workspace/ui/components/typography";
import { ApiKeyList } from "./api-key-list";
import { CreateApiKeyForm } from "./create-api-key-form";

export default async function ApiKeysPage() {
  const plan = await getUserLimits();

  if (plan.limits.apiAccess === 0) {
    return (
      <MaxWidthContainer className="my-8 flex flex-col gap-6 lg:gap-10">
        <div>
          <Typography variant="h1">API Keys</Typography>
          <Typography variant="p" className="text-muted-foreground mt-2">
            API access is only available for Premium users. Upgrade to unlock
            API keys and programmatic access to SaveIt.now.
          </Typography>
        </div>
        <a
          href={APP_LINKS.upgrade}
          className="inline-block w-fit rounded-md bg-primary px-4 py-2 text-white font-medium hover:bg-primary/90 transition"
        >
          Upgrade to Premium
        </a>
      </MaxWidthContainer>
    );
  }

  return (
    <MaxWidthContainer className="my-8 flex flex-col gap-6 lg:gap-10">
      <div>
        <Typography variant="h1">API Keys</Typography>
        <Typography variant="p" className="text-muted-foreground mt-2">
          Manage your API keys to access the SaveIt.now API programmatically.
        </Typography>
      </div>

      <CreateApiKeyForm />

      <ApiKeyList />
    </MaxWidthContainer>
  );
}
