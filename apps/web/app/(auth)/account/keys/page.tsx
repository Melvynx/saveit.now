import { MaxWidthContainer } from "@/features/page/page";
import { auth } from "@/lib/auth";
import { getRequiredUser } from "@/lib/auth-session";
import { serverToast } from "@/lib/server-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ApiKeyList } from "./api-key-list";
import { CreateApiKeyForm } from "./create-api-key-form";

export default async function ApiKeysPage() {
  const user = await getRequiredUser();

  const createApiKey = async (formData: FormData) => {
    "use server";
    const name = formData.get("name") as string;
    
    if (!name || name.trim() === "") {
      await serverToast("Please provide a name for your API key");
      return;
    }

    try {
      await auth.api.createApiKey({
        headers: await headers(),
        body: {
          name: name.trim(),
          expiresIn: 60 * 60 * 24 * 365, // 1 year
        },
      });

      await serverToast("API key created successfully! Make sure to copy it now - you won't be able to see it again.");
      revalidatePath("/account/keys");
    } catch (error) {
      console.error("Failed to create API key:", error);
      await serverToast("Failed to create API key. Please try again.");
    }
  };

  const deleteApiKey = async (keyId: string) => {
    "use server";
    
    try {
      await auth.api.deleteApiKey({
        headers: await headers(),
        body: { keyId },
      });

      await serverToast("API key deleted successfully");
      revalidatePath("/account/keys");
    } catch (error) {
      console.error("Failed to delete API key:", error);
      await serverToast("Failed to delete API key. Please try again.");
    }
  };

  return (
    <MaxWidthContainer className="my-8 flex flex-col gap-6 lg:gap-10">
      <div>
        <Typography variant="h1">API Keys</Typography>
        <Typography variant="p" className="text-muted-foreground mt-2">
          Manage your API keys to access the SaveIt.now API programmatically.
        </Typography>
      </div>

      <CreateApiKeyForm onSubmit={createApiKey} />
      
      <ApiKeyList onDelete={deleteApiKey} />

      <Card>
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
          <CardDescription>
            Use your API keys to access the SaveIt.now API endpoints:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Typography variant="h3" className="mb-2">Base URL</Typography>
            <div className="bg-muted p-3 rounded-md">
              <code>https://saveit.now/api/v1</code>
            </div>
          </div>
          
          <div>
            <Typography variant="h3" className="mb-2">Authentication</Typography>
            <div className="bg-muted p-3 rounded-md">
              <code>Authorization: Bearer YOUR_API_KEY</code>
            </div>
          </div>

          <div>
            <Typography variant="h3" className="mb-2">Available Endpoints</Typography>
            <ul className="space-y-2 text-sm">
              <li><code>POST /bookmarks</code> - Create a new bookmark</li>
              <li><code>GET /bookmarks</code> - Search and list bookmarks</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}