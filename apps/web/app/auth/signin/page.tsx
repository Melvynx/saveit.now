"use client";

import { SignInWith } from "@/features/auth/sign-in-github";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useZodForm,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const EmailPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const MagicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export default function SignInPage() {
  const [isMagicLink, setIsMagicLink] = useState(false);
  const router = useRouter();

  const passwordForm = useZodForm({
    schema: EmailPasswordSchema,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const magicLinkForm = useZodForm({
    schema: MagicLinkSchema,
    defaultValues: {
      email: "",
    },
  });

  const signInMutation = useMutation({
    mutationFn: async (values: z.infer<typeof EmailPasswordSchema>) => {
      return unwrapSafePromise(
        authClient.signIn.email({
          email: values.email,
          password: values.password,
        })
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to sign in");
    },
    onSuccess: () => {
      router.push("/auth");
      router.refresh();
    },
  });

  const magicLinkMutation = useMutation({
    mutationFn: async (values: z.infer<typeof MagicLinkSchema>) => {
      return unwrapSafePromise(
        authClient.signIn.magicLink({
          email: values.email,
          callbackURL: "/auth",
        })
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send magic link");
    },
    onSuccess: () => {
      router.push("/auth/verify");
      router.refresh();
      toast.success("Magic link sent to your email");
    },
  });

  const handlePasswordSubmit = (data: z.infer<typeof EmailPasswordSchema>) => {
    signInMutation.mutate(data);
  };

  const handleMagicLinkSubmit = (data: z.infer<typeof MagicLinkSchema>) => {
    magicLinkMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          We just need a few details to get you started.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isMagicLink ? (
          <Form
            form={magicLinkForm}
            onSubmit={handleMagicLinkSubmit}
            className="space-y-5"
          >
            <FormField
              control={magicLinkForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="hi@yourcompany.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={magicLinkMutation.isPending}
              type="submit"
              className="w-full"
            >
              Send magic link
            </Button>
            <button
              type="button"
              className="text-center w-full text-indigo-500 text-sm"
              onClick={() => setIsMagicLink(false)}
            >
              Login with password instead
            </button>
          </Form>
        ) : (
          <Form
            form={passwordForm}
            onSubmit={handlePasswordSubmit}
            className="space-y-5"
          >
            <FormField
              control={passwordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="hi@yourcompany.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={signInMutation.isPending}
              type="submit"
              className="w-full"
            >
              Sign in
            </Button>
            <button
              type="button"
              className="text-center w-full text-indigo-500 text-sm"
              onClick={() => setIsMagicLink(true)}
            >
              Login with magic link instead
            </button>
          </Form>
        )}

        <div className="before:bg-border after:bg-border flex items-center gap-3 before:h-px before:flex-1 after:h-px after:flex-1">
          <span className="text-muted-foreground text-xs">Or</span>
        </div>

        <div className="flex items-center gap-2 justify-">
          <SignInWith type="github" />
          <SignInWith type="google" />
        </div>

        <p className="text-muted-foreground text-center text-xs">
          No account?{" "}
          <Link className="text-indigo-500" href="/auth/signup">
            Sign Up
          </Link>
        </p>
        <p className="text-muted-foreground text-center text-xs">
          Forget password?{" "}
          <Link className="text-indigo-500" href="/auth/reset-password">
            Reset it
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
