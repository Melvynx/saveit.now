"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { authClient } from "@/lib/auth-client";
import { EmailChangeSchema } from "@/lib/schemas/email-change.schema";
import { useAsyncTask } from "@/lib/use-async-task";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useState } from "react";
import { toast } from "sonner";

interface EmailChangeFormProps {
  currentEmail: string;
}

export function EmailChangeForm({ currentEmail }: EmailChangeFormProps) {
  const [email, setEmail] = useState(currentEmail);
  const [errors, setErrors] = useState<string[]>([]);

  const changeEmailTask = useAsyncTask(
    async (newEmail: string) => {
      const { error } = await authClient.changeEmail({
        newEmail,
        callbackURL: "/account",
      });
      if (error) {
        throw new Error(error.message ?? "Failed to change email");
      }
    },
    {
      onSuccess: () => {
        toast.success("Check your current email for verification link");
      },
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to change email. Please try again.",
        );
      },
    },
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors([]);

    const validation = EmailChangeSchema.safeParse({ newEmail: email });
    if (!validation.success) {
      setErrors(validation.error.issues.map((issue) => issue.message));
      return;
    }

    if (email === currentEmail) {
      setErrors(["New email must be different from current email"]);
      return;
    }

    void changeEmailTask.run(email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Change the email address used for login and notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-sm flex-col gap-2">
            <Label htmlFor="account-email">Email address</Label>
            <Input
              id="account-email"
              type="email"
              name="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              aria-invalid={errors.length > 0}
            />
            {errors.length > 0 && (
              <div className="text-destructive text-sm">
                {errors.map((error) => (
                  <div key={error}>{error}</div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t">
          <LoadingButton
            loading={changeEmailTask.isPending}
            disabled={changeEmailTask.isPending}
            size="sm"
            variant="outline"
          >
            Change email
          </LoadingButton>
        </CardFooter>
      </Card>
    </form>
  );
}
