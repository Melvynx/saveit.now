import { MaxWidthContainer } from "@/features/page/page";
import { getRequiredUser } from "@/lib/auth-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { createApiKey, deleteApiKey } from "./actions";
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