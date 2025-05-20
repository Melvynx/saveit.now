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
import { Typography } from "@workspace/ui/components/typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const magicLinkForm = useZodForm({
    schema: MagicLinkSchema,
    defaultValues: {
      email: "",
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

  const handleMagicLinkSubmit = (data: z.infer<typeof MagicLinkSchema>) => {
    magicLinkMutation.mutate(data);
  };

  return (
    <div className="h-full w-full flex flex-row max-w-5xl gap-8 lg:gap-12 mx-auto lg:my-12 xl:my-24">
      <div className="flex flex-col gap-6 ml-auto flex-1">
        <Typography variant="h2" className="font-bold">
          Never lose an important link again.
        </Typography>
        <Typography variant="lead">
          Save it now—find it in seconds, whether it’s an article, video, post,
          or tool.
        </Typography>
        <ul className="flex flex-col gap-4">
          <li className="flex items-start gap-2">
            <span className="text-lg">⚡</span>
            <div>
              <Typography variant="large" className="font-medium">
                Instant capture
              </Typography>
              <Typography variant="muted">
                Paste any URL and it's safely stored—no friction.
              </Typography>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <Typography variant="large" className="font-medium">
                AI summaries
              </Typography>
              <Typography variant="muted">
                Get the key takeaways of articles and videos without reopening
                them.
              </Typography>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lg">🏷️</span>
            <div>
              <Typography variant="large" className="font-medium">
                Auto-tagging
              </Typography>
              <Typography variant="muted">
                Your library organizes itself—no folders, no mess.
              </Typography>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lg">🔍</span>
            <div>
              <Typography variant="large" className="font-medium">
                Advanced AI Search
              </Typography>
              <Typography variant="muted">
                Type an idea; and our AI will always find the most relevant,
                guaranted.
              </Typography>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lg">🖼️</span>
            <div>
              <Typography variant="large" className="font-medium">
                Visual previews
              </Typography>
              <Typography variant="muted">
                Thumbnails and screenshots help you spot what you need at a
                glance.
              </Typography>
            </div>
          </li>
        </ul>
      </div>
      <Card className="mx-auto flex-1 h-fit">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            We just need a few details to get you started.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
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
          </Form>

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
    </div>
  );
}
