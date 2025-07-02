"use client";

import { MaxWidthContainer } from "@/features/page/page";
import { Typography } from "@workspace/ui/components/typography";
import { ImportForm } from "./import-form";

export default function ImportPage() {
  return (
    <MaxWidthContainer>
      <Typography className="mb-8" variant="h1">
        Import Bookmarks
      </Typography>
      <ImportForm />
    </MaxWidthContainer>
  );
}
