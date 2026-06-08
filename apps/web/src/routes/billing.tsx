import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getBillingPortalUrl = createServerFn({ method: "GET" }).handler(
  async () => {
    const [
      { getRequiredUserOrRedirect },
      { getServerUrl },
      { stripeClient },
      { prisma },
    ] = await Promise.all([
      import("@/lib/auth-session"),
      import("@/lib/server-url"),
      import("@/lib/stripe"),
      import("@workspace/database/client"),
    ]);
    const user = await getRequiredUserOrRedirect();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true },
    });

    if (!dbUser?.stripeCustomerId) {
      return { error: true, url: null };
    }

    const stripe = await stripeClient.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${getServerUrl()}/app`,
    });

    return { error: false, url: stripe.url };
  },
);

export const Route = createFileRoute("/billing")({
  loader: async () => {
    const data = await getBillingPortalUrl();
    if (data.url) throw redirect({ href: data.url });
    return data;
  },
  component: BillingPage,
});

function BillingPage() {
  return (
    <Alert variant="destructive">
      <AlertTitle>No stripe customer id</AlertTitle>
      <AlertDescription>
        Please contact support to get your stripe customer id
      </AlertDescription>
    </Alert>
  );
}
