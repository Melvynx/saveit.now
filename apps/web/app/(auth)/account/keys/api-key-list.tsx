import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { headers } from "next/headers";
import { ApiKeyRow } from "./api-key-row";

interface ApiKeyListProps {
  onDelete: (keyId: string) => Promise<void>;
}

export async function ApiKeyList({ onDelete }: ApiKeyListProps) {
  let apiKeys: unknown[] = [];
  
  try {
    const response = await auth.api.listApiKeys({
      headers: await headers(),
    });
    
    apiKeys = response || [];
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your API Keys</CardTitle>
        <CardDescription>
          {apiKeys.length === 0 
            ? "You haven't created any API keys yet." 
            : `You have ${apiKeys.length} API key${apiKeys.length === 1 ? '' : 's'}.`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Typography variant="muted">
              Create your first API key to get started with the SaveIt.now API.
            </Typography>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey: any) => (
              <ApiKeyRow
                key={apiKey.id}
                apiKey={apiKey}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}