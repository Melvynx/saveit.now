"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { upfetch } from "@/lib/up-fetch";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

export function UnsubscribeForm({ userId }: { userId: string }) {
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);

  const unsubscribeMutation = useMutation({
    mutationFn: async () =>
      upfetch(`/api/unsubscribe/${userId}`, {
        method: "POST",
        body: {},
        schema: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
      }),
    onSuccess: () => {
      setIsUnsubscribed(true);
    },
  });

  if (isUnsubscribed) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <Typography variant="h3">Unsubscribed Successfully</Typography>
        <Alert>
          <AlertDescription>
            You have been unsubscribed from all marketing emails from
            SaveIt.now. You may still receive important account-related emails
            for security and billing purposes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LoadingButton
        loading={unsubscribeMutation.isPending}
        onClick={() => unsubscribeMutation.mutate()}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        Yes, Unsubscribe Me
      </LoadingButton>

      {unsubscribeMutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {unsubscribeMutation.error.message}
          </AlertDescription>
        </Alert>
      )}

      <a href="/" className="block">
        <Button variant="outline" className="w-full">
          No, Keep Me Subscribed
        </Button>
      </a>
    </div>
  );
}

