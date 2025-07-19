"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { Button } from "@workspace/ui/components/button";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Typography } from "@workspace/ui/components/typography";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { unsubscribeUserAction } from "./unsubscribe.action";

export function UnsubscribeForm({ userId }: { userId: string }) {
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const result = await unsubscribeUserAction({ userId });
      if (result?.data) {
        return result.data;
      }
      throw new Error(result?.serverError?.message ?? "Something went wrong");
    },
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
            You have been unsubscribed from all marketing emails from SaveIt.now.
            You may still receive important account-related emails for security and billing purposes.
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
      
      <Link href="/" className="block">
        <Button variant="outline" className="w-full">
          No, Keep Me Subscribed
        </Button>
      </Link>
    </div>
  );
}