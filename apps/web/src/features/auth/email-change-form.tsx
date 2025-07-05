"use client";

import { SubmitButton } from "@/features/form/loading-button";
import { EmailChangeSchema } from "@/lib/schemas/email-change.schema";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { useState } from "react";

interface EmailChangeFormProps {
  currentEmail: string;
  onEmailChange: (formData: FormData) => Promise<void>;
}

export function EmailChangeForm({ currentEmail, onEmailChange }: EmailChangeFormProps) {
  const [email, setEmail] = useState(currentEmail);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (formData: FormData) => {
    setErrors([]);
    
    // Client-side validation
    const newEmail = formData.get("email") as string;
    const validation = EmailChangeSchema.safeParse({ newEmail });
    
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => issue.message);
      setErrors(errorMessages);
      return;
    }

    if (newEmail === currentEmail) {
      setErrors(["New email must be different from current email"]);
      return;
    }

    try {
      await onEmailChange(formData);
      // Keep the current email in the form - don't clear it
    } catch (error) {
      // Error handling is done in the server action with serverToast
      console.error("Error changing email:", error);
    }
  };

  return (
    <form action={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              type="email"
              name="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={errors.length > 0 ? "border-red-500" : ""}
            />
            {errors.length > 0 && (
              <div className="text-sm text-red-500">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <SubmitButton>Change Email</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
