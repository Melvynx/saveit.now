"use client";

import { ExportForm } from "./export-form";

export default function ExportsPage() {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-2xl font-bold">Export Bookmarks</h1>
        <p className="mb-6 text-muted-foreground">
          Export all your bookmarks to a CSV file for backup or migration purposes.
        </p>
        <ExportForm />
      </div>
    </div>
  );
}