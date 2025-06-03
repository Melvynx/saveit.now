"use client";

import { ImportForm } from "./import-form";

export default function ImportPage() {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-2xl font-bold">Import Bookmarks</h1>
        <ImportForm />
      </div>
    </div>
  );
}
