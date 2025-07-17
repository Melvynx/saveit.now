import { MaxWidthContainer } from "@/features/page/page";
import { getRequiredUser } from "@/lib/auth-session";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Learn how to use the SaveIt.now API with your API keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Typography variant="default" className="font-medium">
                  API Overview
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  Authentication, rate limits, and response formats
                </Typography>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/docs/api-overview" target="_blank" rel="noopener noreferrer">
                  View Docs
                </a>
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Typography variant="default" className="font-medium">
                  Create Bookmark
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  POST /api/v1/bookmarks - Add new bookmarks
                </Typography>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/docs/api-bookmarks-create" target="_blank" rel="noopener noreferrer">
                  View Docs
                </a>
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Typography variant="default" className="font-medium">
                  List Bookmarks
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  GET /api/v1/bookmarks - Search and retrieve bookmarks
                </Typography>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/docs/api-bookmarks-list" target="_blank" rel="noopener noreferrer">
                  View Docs
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}