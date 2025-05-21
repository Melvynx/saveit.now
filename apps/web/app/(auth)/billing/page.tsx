import { getRequiredUser } from "@/lib/auth-session";
import { getServerUrl } from "@/lib/server-url";
import { stripeClient } from "@/lib/stripe";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { redirect } from "next/navigation";

export default async function RoutePage() {
  const user = await getRequiredUser();

  if (!user.stripeCustomerId) {
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
    customer: user.stripeCustomerId,
    return_url: `${getServerUrl()}/app`,
  });

  return redirect(stripe.url);
}
