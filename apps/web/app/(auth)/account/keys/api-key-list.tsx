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

interface BetterAuthApiKey {
  permissions: { [key: string]: string[]; } | null;
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  userId: string;
  refillInterval: number | null;
  refillAmount: number | null;
  lastRefillAt: Date | null;
  enabled: boolean | null;
  rateLimitEnabled: boolean | null;
  rateLimitTimeWindow: number | null;
  rateLimitMax: number | null;
  requestCount: number | null;
  remaining: number | null;
  lastRequest: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any> | null;
}

interface ApiKeyListProps {
  onDelete: (keyId: string) => Promise<void>;
}

export async function ApiKeyList({ onDelete }: ApiKeyListProps) {
  let apiKeys: BetterAuthApiKey[] = [];
  
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
            {apiKeys.map((apiKey) => (
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