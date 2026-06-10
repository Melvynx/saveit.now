"use client";

import { api } from "@convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation } from "convex/react";
import { Download, FileText, Package } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";
import { toast } from "sonner";

type ExportFormProps = {
  className?: string;
};

export function ExportForm({ className }: ExportFormProps) {
  const [isExporting, setIsExporting] = useState(false);
  const posthog = usePostHog();
  const exportCsv = useMutation(api.bookmarks.mutations.exportCsv);

  const handleExport = async () => {
    setIsExporting(true);
    posthog.capture("export_bookmarks");

    try {
      const csvContent = await exportCsv({});

      const blob = new Blob([csvContent as string], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bookmarks-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Successfully exported bookmarks");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while exporting",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Export Your Bookmarks
          </CardTitle>
          <CardDescription>
            Download all your bookmarks in CSV format. The export will include
            title, description, summary, type, and URL for each bookmark.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/25">
            <div className="flex items-start gap-3">
              <FileText className="size-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">CSV Format</p>
                <p className="text-xs text-muted-foreground">
                  Your export will contain the following columns:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Title - The bookmark title</li>
                  <li>Description - Open Graph description</li>
                  <li>Summary - AI-generated summary</li>
                  <li>Type - Bookmark type (VIDEO, ARTICLE, PAGE, etc.)</li>
                  <li>URL - The original bookmark URL</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              "Exporting..."
            ) : (
              <>
                <Download className="size-4 mr-2" />
                Export Bookmarks
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
