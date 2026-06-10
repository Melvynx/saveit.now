import { EmailComposer } from "@/features/admin/email-composer";
import { AdminPageHeader } from "@/features/admin/admin-shared";
import { useSession } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useQuery } from "convex/react";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/admin/send-email")({
  component: SendEmailPage,
});

function SendEmailPage() {
  const session = useSession();
  const role = (session.data?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin";
  const stats = useQuery(
    api.admin.queries.getMarketingStats,
    isAdmin ? {} : "skip",
  );

  if (session.isPending) return null;
  if (!session.data?.user) return <Navigate to="/signin" />;
  if (!isAdmin) return null;
  if (!stats) return null;

  const { eligibleUsersCount } = stats;

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
