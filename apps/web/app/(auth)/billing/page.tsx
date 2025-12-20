import { getRequiredUser } from "@/lib/auth-session";
import { getServerUrl } from "@/lib/server-url";
import { stripeClient } from "@/lib/stripe";
import { prisma } from "@workspace/database";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { redirect } from "next/navigation";

export default async function RoutePage() {
  const user = await getRequiredUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });

  if (!dbUser?.stripeCustomerId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No stripe customer id</AlertTitle>
        <AlertDescription>
          Please contact support to get your stripe customer id
        </AlertDescription>
      </Alert>
    );
  }

  const stripe = await stripeClient.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${getServerUrl()}/app`,
  });

  return redirect(stripe.url);
}
