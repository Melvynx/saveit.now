import { AccountShell } from "@/features/account/account-shell";
import { ExportForm } from "@/features/exports/export-form";
import { APP_LINKS } from "@/lib/app-links";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { AlertCircle } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getExportLimits = createServerFn({ method: "GET" }).handler(async () => {
  const { getUserLimitsOrRedirect } = await import("@/lib/auth-session");
  return getUserLimitsOrRedirect();
});

export const Route = createFileRoute("/exports")({
  loader: () => getExportLimits(),
  component: ExportsPage,
});

function ExportsPage() {
  const user = Route.useLoaderData();

  if (!user.limits.canExport) {
    return (
      <AccountShell>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div>
            <AlertTitle>
              You do not have permission to export bookmarks
            </AlertTitle>
            <AlertDescription>
              Please upgrade to a paid plan to export your bookmarks.
            </AlertDescription>
            <Button variant="outline" asChild>
              <a href={APP_LINKS.upgrade}>Upgrade</a>
            </Button>
          </div>
        </Alert>
      </AccountShell>
    );
  }

  return (
    <AccountShell>
      <div className="container py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-2xl font-bold">Export Bookmarks</h1>
          <p className="mb-6 text-muted-foreground">
            Export all your bookmarks to a CSV file for backup or migration
            purposes.
          </p>
          <ExportForm />
        </div>
      </div>
    </AccountShell>
  );
}
