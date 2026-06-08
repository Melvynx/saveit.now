import { ApiKeyRow } from "@/features/account/api-keys/api-key-row";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

type ApiKey = {
  id: string;
  name: string | null;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  lastRequest?: Date | string | null;
};

export function ApiKeyList({ apiKeys }: { apiKeys: ApiKey[] }) {
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
          <div className="border-border bg-muted/30 rounded-md border py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Create your first API key to get started with the SaveIt.now API.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {apiKeys.map((apiKey) => (
              <ApiKeyRow key={apiKey.id} apiKey={apiKey} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
