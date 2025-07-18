import { MaxWidthContainer } from "@/features/page/page";
import { getRequiredUser } from "@/lib/auth-session";
import { Typography } from "@workspace/ui/components/typography";
import { ApiKeyList } from "./api-key-list";
import { CreateApiKeyForm } from "./create-api-key-form";

export default async function ApiKeysPage() {
  await getRequiredUser();

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
