import { api } from "@convex/_generated/api";
import { useConvexAction } from "@convex-dev/react-query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/billing")({
  component: BillingPage,
});

function BillingPage() {
  const createBillingPortal = useConvexAction(
    api.stripe.actions.createBillingPortal,
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await createBillingPortal({});
      return result;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to open billing portal",
      );
    },
  });

  useEffect(() => {
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mutation.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Billing portal unavailable</AlertTitle>
        <AlertDescription>
          {mutation.error instanceof Error
            ? mutation.error.message
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
