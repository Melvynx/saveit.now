"use client";

import { OtpForm } from "@/components/better-auth-otp";
import { SignInWith } from "@/features/auth/sign-in-with";
import { MaxWidthContainer } from "@/features/page/page";
import { authClient, useSession } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Suspense } from "react";

function SignInPageContent() {
  const router = useRouter();
  const session = useSession();
  const searchParams = useSearchParams();

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
          <OtpForm
            sendOtp={async (email) => {
              const result = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: "sign-in",
              });
              if (result.error) throw new Error(result.error.message);
            }}
            verifyOtp={async (email, otp) => {
              const result = await authClient.signIn.emailOtp({ email, otp });
              if (result.error) throw new Error(result.error.message);

              return result.data.user;
            }}
            onSuccess={() => {
              router.push(searchParams.get("redirectUrl") || "/app");
              session.refetch();
            }}
            onError={(error) => toast.error(error)}
          />

          <div className="before:bg-border after:bg-border flex items-center gap-3 before:h-px before:flex-1 after:h-px after:flex-1">
            <span className="text-muted-foreground text-xs">Or</span>
          </div>

          <div className="@sm:flex-row flex-col flex items-center gap-2">
            <SignInWith className="w-full" type="github" buttonProps={{}} />
            <SignInWith className="w-full" type="google" buttonProps={{}} />
          </div>
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}

function SignInPageSkeleton() {
  return (
    <MaxWidthContainer
      spacing="sm"
      className="flex h-full w-full min-h-fit items-start flex-col lg:flex-row gap-8 lg:gap-12"
    >
      <div className="ml-auto flex lg:flex-1 flex-col gap-6">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-6 bg-muted rounded animate-pulse" />
      </div>
      <Card className="mx-auto h-fit flex-1 @container w-full">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            We just need a few details to get you started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-20 bg-muted rounded animate-pulse" />
          <div className="h-px bg-muted" />
          <div className="flex gap-2">
            <div className="h-10 bg-muted rounded animate-pulse flex-1" />
            <div className="h-10 bg-muted rounded animate-pulse flex-1" />
          </div>
        </CardContent>
      </Card>
    </MaxWidthContainer>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageSkeleton />}>
      <SignInPageContent />
    </Suspense>
  );
}
