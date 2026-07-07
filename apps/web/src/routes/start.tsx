import { AccountShell } from "@/features/account/account-shell";
import { ImportForm } from "@/features/imports/import-form";
import { MaxWidthContainer } from "@/features/page/page";
import { APP_LINKS } from "@/lib/app-links";
import { useSession } from "@/lib/auth-client";
import { useAsyncTask } from "@/lib/use-async-task";
import { api } from "@convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { useMutation } from "convex/react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/start")({
  component: StartPage,
});

function StartPage() {
  const session = useSession();
  const navigate = useNavigate();
  const setOnboarding = useMutation(api.users.mutations.setOnboarding);

  const finishTask = useAsyncTask(
    async (params: "extension" | "app") => {
      await setOnboarding({});
      return params;
    },
    {
      onSuccess: (params) => {
        void session.refetch();
        setTimeout(() => {
          if (params === "extension") {
            void navigate({ to: APP_LINKS.extensions });
          } else {
            void navigate({ to: APP_LINKS.app });
          }
        }, 500);
        toast.success("Onboarding finished");
      },
      onError: () => {
        toast.error("Failed to finish onboarding");
      },
    },
  );

  const handleImportSuccess = (data: {
    createdBookmarks: number;
    totalUrls: number;
  }) => {
    void finishTask.run("app");
    toast.success(
      `Great! You've imported ${data.createdBookmarks} bookmarks. Let's explore your dashboard!`,
    );
  };

  return (
    <AccountShell>
      <MaxWidthContainer className="py-8 flex-col gap-8 lg:gap-12 flex">
        <div className="text-center mb-8">
          <Typography variant="h1" className="mb-4">
            Welcome to SaveIt.now! 🎉
          </Typography>
          <Typography variant="muted" className="text-lg">
            I know you have bookmarks somewhere else. Let's make a quick
            onboarding to get you started!
          </Typography>
        </div>

        <div className="flex flex-col gap-4">
          <Typography variant="h2">Import</Typography>
          <ImportForm onSuccess={handleImportSuccess} className="border-0 p-0" />
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Don't have bookmarks to import?</CardTitle>
            <CardDescription>
              No worries! You can start fresh and add bookmarks as you browse.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              variant="outline"
              onClick={() => void finishTask.run("app")}
            >
              <a href={APP_LINKS.app}>
                Start with Empty Dashboard
                <ArrowRight className="size-4 ml-2" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              onClick={() => void finishTask.run("extension")}
            >
              <a href={APP_LINKS.extensions}>
                Install Browser Extension
                <ArrowRight className="size-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <Typography variant="muted">
            Need help? Check out our{" "}
            <a href="/docs" className="underline hover:text-foreground">
              documentation
            </a>{" "}
            or{" "}
            <a href="/support" className="underline hover:text-foreground">
              contact support
            </a>
            .
          </Typography>
        </div>
      </MaxWidthContainer>
    </AccountShell>
  );
}
