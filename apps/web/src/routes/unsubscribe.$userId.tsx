import { UnsubscribeForm } from "@/features/unsubscribe/unsubscribe-form";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ConvexHttpClient } from "convex/browser";
import { type FunctionReference, makeFunctionReference } from "convex/server";

const convexUrl =
  (import.meta.env?.VITE_CONVEX_URL ?? process.env.VITE_CONVEX_URL) || "";

// api.email.queries.getUnsubscribeStatus — defined in email/queries.ts (added in this migration).
// Types regenerate after `convex dev`; we use a typed FunctionReference here.
const getUnsubscribeStatusRef = makeFunctionReference<
  "query",
  { userId: string },
  { id: string; email: string; unsubscribed: boolean } | null
>("email/queries:getUnsubscribeStatus");

const getUnsubscribeData = createServerFn({ method: "GET" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const convex = new ConvexHttpClient(convexUrl);
    const user = await convex.query(getUnsubscribeStatusRef, {
      userId: data.userId,
    });
    return { user };
  });

export const Route = createFileRoute("/unsubscribe/$userId")({
  loader: ({ params }) => getUnsubscribeData({ data: params }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { user } = Route.useLoaderData();

  if (!user) {
    return <div>Not found</div>;
  }

  if (user.unsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Typography variant="h2">Already Unsubscribed</Typography>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                You are already unsubscribed from marketing emails.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Typography variant="h2">Unsubscribe</Typography>
          <Typography variant="muted">
            Are you sure you want to unsubscribe from marketing emails?
          </Typography>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Email: <span className="font-medium">{user.email}</span>
            </AlertDescription>
          </Alert>
          <UnsubscribeForm userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
