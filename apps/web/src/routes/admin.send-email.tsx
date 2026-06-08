import { EmailComposer } from "@/features/admin/email-composer";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Mail } from "lucide-react";

const getSendEmailData = createServerFn({ method: "GET" }).handler(async () => {
  const [{ getRequiredUserOrRedirect }, { getMarketingEligibleUsersCount }] =
    await Promise.all([
      import("@/lib/auth-session"),
      import("@/lib/database/marketing-users"),
    ]);
  const user = await getRequiredUserOrRedirect();
  if (user.role !== "admin") {
    throw new Response("Not found", { status: 404 });
  }

  return { eligibleUsersCount: await getMarketingEligibleUsersCount() };
});

export const Route = createFileRoute("/admin/send-email")({
  loader: () => getSendEmailData(),
  component: SendEmailPage,
});

function SendEmailPage() {
  const { eligibleUsersCount } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="size-6" />
        <Typography variant="h1">Send Marketing Email</Typography>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Compose Marketing Email</CardTitle>
          <CardDescription>
            Send an email to all {eligibleUsersCount} users who have opted in to
            marketing emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailComposer eligibleUsersCount={eligibleUsersCount} />
        </CardContent>
      </Card>
    </div>
  );
}
