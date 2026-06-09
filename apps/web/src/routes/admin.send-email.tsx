import { EmailComposer } from "@/features/admin/email-composer";
import { AdminPageHeader } from "@/features/admin/admin-shared";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Mail } from "lucide-react";

const getSendEmailData = createServerFn({ method: "GET" }).handler(async () => {
  const [{ getUser }, { getMarketingEligibleUsersCount }] = await Promise.all([
    import("@/lib/auth-session"),
    import("@/lib/database/marketing-users"),
  ]);
  const user = await getUser();
  if (!user) {
    return { access: "signed-out" as const };
  }

  if (user.role !== "admin") {
    return { access: "forbidden" as const };
  }

  return {
    access: "granted" as const,
    eligibleUsersCount: await getMarketingEligibleUsersCount(),
  };
});

export const Route = createFileRoute("/admin/send-email")({
  loader: () => getSendEmailData(),
  component: SendEmailPage,
});

function SendEmailPage() {
  const data = Route.useLoaderData();
  if (data.access === "signed-out") return <Navigate to="/signin" />;
  if (data.access === "forbidden") return null;

  const { eligibleUsersCount } = data;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <AdminPageHeader
        title="Marketing Email"
        description="Compose and send a campaign to users who opted into marketing emails."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4" />
            Compose campaign
          </CardTitle>
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
