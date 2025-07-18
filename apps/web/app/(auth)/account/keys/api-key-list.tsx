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

export async function ApiKeyList() {
  const apiKeys = await auth.api.listApiKeys({
    headers: await headers(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your API Keys</CardTitle>
        <CardDescription>
          {apiKeys.length === 0
            ? "You haven't created any API keys yet."
            : `You have ${apiKeys.length} API key${apiKeys.length === 1 ? "" : "s"}.`}
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
              <ApiKeyRow key={apiKey.id} apiKey={apiKey} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
