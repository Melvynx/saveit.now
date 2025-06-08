import { APP_LINKS } from "@/lib/app-links";
import { getUserLimits } from "@/lib/auth-session";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { ExportForm } from "./export-form";

export default async function ExportsPage() {
  const user = await getUserLimits();

  if (!user.limits.canExport) {
    return (
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
            <Link href={APP_LINKS.upgrade}>Upgrade</Link>
          </Button>
        </div>
      </Alert>
    );
  }

  return (
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
  );
}
