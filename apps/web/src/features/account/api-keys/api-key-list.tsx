import { ApiKeyRow } from "@/features/account/api-keys/api-key-row";
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { ReactNode } from "react";

export type ApiKey = {
  id: string;
  name: string | null;
  start?: string | null;
  prefix?: string | null;
  enabled?: boolean | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  expiresAt?: Date | string | null;
  lastRequest?: Date | string | null;
};

export function ApiKeyList({
  apiKeys,
  action,
  onChanged,
}: {
  apiKeys: ApiKey[];
  action?: ReactNode;
  onChanged?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your API Keys</CardTitle>
        <CardDescription>
          {apiKeys.length === 0
            ? "You haven't created any API keys yet."
            : `You have ${apiKeys.length} API key${apiKeys.length === 1 ? "" : "s"}.`}
        </CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="px-0">
        {apiKeys.length === 0 ? (
          <div className="border-border bg-muted/30 mx-4 rounded-md border py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Create your first API key to get started with the SaveIt.now API.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-10 pr-4 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <ApiKeyRow
                  key={apiKey.id}
                  apiKey={apiKey}
                  onChanged={onChanged}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
