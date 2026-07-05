import { api } from "@convex/_generated/api";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/billing")({
  component: BillingPage,
});

function BillingPage() {
  const createBillingPortal = useAction(api.stripe.actions.createBillingPortal);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    let cancelled = false;

    async function redirectToPortal() {
      try {
        const data = await createBillingPortal({});
        if (cancelled) return;
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        if (cancelled) return;
        setError(err);
        toast.error(
          err instanceof Error ? err.message : "Failed to open billing portal",
        );
      }
    }

    void redirectToPortal();
    return () => {
      cancelled = true;
    };
  }, [createBillingPortal, isAuthenticated, isLoading]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Billing portal unavailable</AlertTitle>
        <AlertDescription>
          {error instanceof Error
            ? error.message
            : "No billing account found. Please contact support."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-32">
      <div className="text-muted-foreground text-sm">
        Redirecting to billing portal...
      </div>
    </div>
  );
}
