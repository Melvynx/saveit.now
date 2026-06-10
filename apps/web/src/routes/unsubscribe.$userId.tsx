import { UnsubscribeForm } from "@/features/unsubscribe/unsubscribe-form";
import { api } from "@convex/_generated/api";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";

type UnsubscribeSearch = {
  token?: string;
  timestamp?: string;
};

export const Route = createFileRoute("/unsubscribe/$userId")({
  validateSearch: (search: Record<string, unknown>): UnsubscribeSearch => {
    const token = typeof search.token === "string" ? search.token : undefined;
    const timestamp =
      typeof search.timestamp === "string"
        ? search.timestamp
        : typeof search.ts === "string"
          ? search.ts
          : undefined;

    return { token, timestamp };
  },
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { userId } = Route.useParams();
  const { token, timestamp } = Route.useSearch();
  const user = useQuery(
    api.email.queries.getUnsubscribeStatus,
    token && timestamp ? { userId, token, timestamp } : "skip",
  );

  if (!token || !timestamp) {
    return (
      <UnsubscribeCard title="Invalid unsubscribe link">
        <Alert variant="destructive">
          <AlertDescription>
            This unsubscribe link is missing its signature. Please use the link
            from the email you received.
          </AlertDescription>
        </Alert>
      </UnsubscribeCard>
    );
  }

  if (user === undefined) {
    return (
      <UnsubscribeCard title="Unsubscribe">
        <Typography variant="muted">Checking unsubscribe link...</Typography>
      </UnsubscribeCard>
    );
  }

  if (!user) {
    return (
      <UnsubscribeCard title="Invalid unsubscribe link">
        <Alert variant="destructive">
          <AlertDescription>
            This unsubscribe link is invalid or has expired.
          </AlertDescription>
        </Alert>
      </UnsubscribeCard>
    );
  }

  if (user.unsubscribed) {
    return (
      <UnsubscribeCard title="Already Unsubscribed">
        <Alert>
          <AlertDescription>
            You are already unsubscribed from marketing emails.
          </AlertDescription>
        </Alert>
      </UnsubscribeCard>
    );
  }

  return (
    <UnsubscribeCard title="Unsubscribe">
      <Typography variant="muted">
        Are you sure you want to unsubscribe from marketing emails?
      </Typography>
      <Alert>
        <AlertDescription>
          Email: <span className="font-medium">{user.email}</span>
        </AlertDescription>
      </Alert>
      <UnsubscribeForm userId={userId} />
    </UnsubscribeCard>
  );
}

function UnsubscribeCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Typography variant="h2">{title}</Typography>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}
