import { prisma } from "@workspace/database";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { UnsubscribeForm } from "./unsubscribe-form";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, unsubscribed: true },
  });

  if (!user) {
    notFound();
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