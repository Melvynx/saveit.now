"use client";

import { SignInWith } from "@/features/auth/sign-in-with";
import { MaxWidthContainer } from "@/features/page/page";
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
          callbackURL: "/app",
        }),
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send magic link");
    },
    onSuccess: () => {
      router.push("/verify");
      router.refresh();
      toast.success("Magic link sent to your email");
    },
  });

  const handleMagicLinkSubmit = (data: z.infer<typeof MagicLinkSchema>) => {
    magicLinkMutation.mutate(data);
  };

  return (
    <MaxWidthContainer
      spacing="sm"
      className="flex h-full w-full min-h-fit items-start flex-col lg:flex-row gap-8 lg:gap-12"
    >
      <div className="ml-auto flex lg:flex-1 flex-col gap-6">
        <Typography variant="h2" className="font-bold">
          Never lose an important link again.
        </Typography>
        <Typography variant="lead">
          Save it now—find it in seconds, whether it’s an article, video, post,
          or tool.
        </Typography>
        <ul className="hidden lg:flex flex-col gap-4">
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
      <Card className="mx-auto h-fit flex-1 @container w-full">
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

          <div className="@sm:flex-row flex-col flex items-center gap-2">
            <SignInWith className="w-full" type="github" />
            <SignInWith className="w-full" type="google" />
          </div>
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}
