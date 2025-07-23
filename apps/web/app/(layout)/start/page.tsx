/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { MaxWidthContainer } from "@/features/page/page";
import { APP_LINKS } from "@/lib/app-links";
import { useSession } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImportForm } from "../imports/import-form";
import { finishOnboardingAction } from "./start.action";

export default function StartPage() {
  const session = useSession();
  const router = useRouter();
  const finishMutation = useMutation({
    mutationFn: (_params: "extension" | "app") => finishOnboardingAction({}),
    onSuccess: (_, params) => {
      session.refetch();
      setTimeout(() => {
        if (params === "extension") {
          router.push(APP_LINKS.extensions);
        } else {
          router.push(APP_LINKS.app);
        }
      }, 500);
      toast.success("Onboarding finished");
    },
    onError: () => {
      toast.error("Failed to finish onboarding");
    },
  });
  const handleImportSuccess = (data: {
    createdBookmarks: number;
    totalUrls: number;
  }) => {
    finishMutation.mutate("app");
    toast.success(
      `Great! You've imported ${data.createdBookmarks} bookmarks. Let's explore your dashboard!`,
    );
  };

  return (
    <MaxWidthContainer className="py-8 flex-col gap-8 lg:gap-12 flex">
      {/* Header */}
      <div className="text-center mb-8">
        <Typography variant="h1" className="mb-4">
          Welcome to SaveIt.now! 🎉
        </Typography>
        <Typography variant="muted" className="text-lg">
          I know you have bookmarks somewhere else. Let's make a quick
          onboarding to get you started!
        </Typography>
      </div>

      {/* Onboarding Steps */}
      {/* Step 1: Import */}
      <div className="flex flex-col gap-4">
        <Typography variant="h2">Import</Typography>

        <ImportForm onSuccess={handleImportSuccess} className="border-0 p-0" />
      </div>

      {/* Alternative Options */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Don't have bookmarks to import?</CardTitle>
          <CardDescription>
            No worries! You can start fresh and add bookmarks as you browse.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button asChild variant="outline">
            <Link
              href={APP_LINKS.app}
              onClick={() => finishMutation.mutate("app")}
            >
              Start with Empty Dashboard
              <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={APP_LINKS.extensions}
              onClick={() => finishMutation.mutate("extension")}
            >
              Install Browser Extension
              <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="text-center mt-8 text-sm text-muted-foreground">
        <Typography variant="muted">
          Need help? Check out our{" "}
          <Link href="/docs" className="underline hover:text-foreground">
            documentation
          </Link>{" "}
          or{" "}
          <Link href="/support" className="underline hover:text-foreground">
            contact support
          </Link>
          .
        </Typography>
      </div>
    </MaxWidthContainer>
  );
}
