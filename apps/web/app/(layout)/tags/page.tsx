"use client";

import { MaxWidthContainer } from "@/features/page/page";
import { Typography } from "@workspace/ui/components/typography";
import { TagsPageClient } from "./tags-page-client";

export default function TagsPage() {
  return (
    <MaxWidthContainer>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <Typography variant="h1">
          Tags Management
        </Typography>
      </div>
      <TagsPageClient />
    </MaxWidthContainer>
  );
}