import { getRequiredUser } from "@/lib/auth-session";
import { getMarketingEligibleUsersCount } from "@/lib/database/marketing-users";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Mail } from "lucide-react";
import { notFound } from "next/navigation";
import { EmailComposer } from "./email-composer";

export default async function SendEmailPage() {
  const user = await getRequiredUser();

  if (user.role !== "admin") {
    notFound();
  }

  const eligibleUsersCount = await getMarketingEligibleUsersCount();

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
            Send an email to all {eligibleUsersCount} users who have opted in to marketing emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailComposer eligibleUsersCount={eligibleUsersCount} />
        </CardContent>
      </Card>
    </div>
  );
}