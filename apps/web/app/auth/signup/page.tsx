"use client";

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
import { toast } from "sonner";
import { z } from "zod";
import { SignInWith } from "../../../src/features/auth/sign-in-github";

const SignUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function SignUpPage() {
  const router = useRouter();

  const form = useZodForm({
    schema: SignUpSchema,
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (values: z.infer<typeof SignUpSchema>) => {
      return unwrapSafePromise(
        authClient.signUp.email({
          email: values.email,
          name: values.name,
          password: values.password,
          callbackURL: "/auth",
        })
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to sign up");
    },
    onSuccess: () => {
      router.push("/auth");
      router.refresh();
    },
  });

  const handleSubmit = (data: z.infer<typeof SignUpSchema>) => {
    signUpMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign up</CardTitle>
        <CardDescription>
          We just need a few details to get you started.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Form form={form} onSubmit={handleSubmit} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Matt Welsh" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
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
            control={form.control}
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
            disabled={signUpMutation.isPending}
            type="submit"
            className="w-full"
          >
            {signUpMutation.isPending ? "Signing up..." : "Sign up"}
          </Button>
        </Form>

        <div className="before:bg-border after:bg-border flex items-center gap-3 before:h-px before:flex-1 after:h-px after:flex-1">
          <span className="text-muted-foreground text-xs">Or</span>
        </div>

        <div className="flex items-center gap-2 justify-">
          <SignInWith type="github" />
          <SignInWith type="google" />
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Already have an account?{" "}
          <Link className="text-indigo-500" href="/auth/signin">
            Sign In
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
