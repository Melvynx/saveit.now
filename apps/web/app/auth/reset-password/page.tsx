"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEventHandler, useState } from "react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") as string;

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmitPassword: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;

    const { data, error } = await authClient.resetPassword(
      {
        token: token,
        newPassword: password,
      },
      {
        onRequest: () => {
          setIsLoading(true);
        },
        onSuccess: () => {
          router.push("/auth/signin");
          router.refresh();
        },
        onError: (ctx: { error: { message: string } }) => {
          toast.error(ctx.error.message);
          setIsLoading(false);
        },
      }
    );
    console.log(data, error);
  };

  const handleSubmitEmail: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    console.log("auth rest", email);
    const { data, error } = await authClient.forgetPassword(
      {
        email,
        redirectTo: "/auth/reset-password",
      },
      {
        onRequest: () => {
          setIsLoading(true);
        },
        onSuccess: () => {
          router.push("/auth/verify");
        },
        onError: (ctx: { error: { message: string } }) => {
          toast.error(ctx.error.message);
          setIsLoading(false);
        },
      }
    );
    console.log(JSON.stringify({ data, error }, null, 2));
  };

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset Password email</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <form className="space-y-5" onSubmit={handleSubmitEmail}>
            <div className="space-y-4">
              <div className="*:not-first:mt-2">
                <Label htmlFor={`email`}>email</Label>
                <Input
                  id={`email`}
                  placeholder="Enter your email"
                  type="email"
                  required
                  name="email"
                />
              </div>
            </div>
            <Button disabled={isLoading} type="submit" className="w-full">
              Receive token
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>{token}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form className="space-y-5" onSubmit={handleSubmitPassword}>
          <div className="space-y-4">
            <div className="*:not-first:mt-2">
              <Label htmlFor={`password`}>Password</Label>
              <Input
                id={`password`}
                placeholder="Enter your password"
                type="password"
                required
                name="password"
              />
            </div>
          </div>
          <Button disabled={isLoading} type="submit" className="w-full">
            Reset Passowrd
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
