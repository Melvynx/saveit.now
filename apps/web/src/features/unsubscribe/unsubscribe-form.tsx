"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { useAsyncTask } from "@/lib/use-async-task";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { CheckCircle } from "lucide-react";
import { useState } from "react";

const convexSiteUrl = import.meta.env?.VITE_CONVEX_SITE_URL ?? "";

export function UnsubscribeForm({ userId }: { userId: string }) {
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);

  const unsubscribeTask = useAsyncTask(
    async () => {
      // Token + timestamp supplied via URL search params from the email link.
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      );
      const token = params.get("token");
      const timestamp = params.get("timestamp") ?? params.get("ts");

      const qs = new URLSearchParams({ userId });
      if (token) qs.set("token", token);
      if (timestamp) qs.set("timestamp", timestamp);

      const res = await fetch(
        `${convexSiteUrl}/unsubscribe/${userId}?${qs.toString()}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error ?? "Failed to unsubscribe");
      }
      return res.json() as Promise<{ success: boolean; message: string }>;
    },
    {
      onSuccess: () => {
        setIsUnsubscribed(true);
      },
    },
  );

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
        loading={unsubscribeTask.isPending}
        onClick={() => void unsubscribeTask.run()}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        Yes, Unsubscribe Me
      </LoadingButton>

      {unsubscribeTask.error instanceof Error && (
        <Alert variant="destructive">
          <AlertDescription>{unsubscribeTask.error.message}</AlertDescription>
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
