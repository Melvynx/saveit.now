"use client";

import { MaxWidthContainer } from "@/features/page/page";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowRight, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ImportForm } from "../imports/import-form";

export default function StartPage() {
  const [, setHasImported] = useState(false);

  const handleImportSuccess = (data: {
    createdBookmarks: number;
    totalUrls: number;
  }) => {
    setHasImported(true);
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
      <Card className="relative">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5" />
              Import Your Bookmarks
            </CardTitle>
          </div>
          <CardDescription>
            Bring your existing bookmarks from browsers, bookmark managers, or
            any text files containing URLs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm
            onSuccess={handleImportSuccess}
            className="border-0 p-0"
          />
        </CardContent>
      </Card>

      {/* Alternative Options */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-center">
            Don't have bookmarks to import?
          </CardTitle>
          <CardDescription className="text-center">
            No worries! You can start fresh and add bookmarks as you browse.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/app">
              Start with Empty Dashboard
              <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/extensions">
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
