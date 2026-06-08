import { AccountShell } from "@/features/account/account-shell";
import { MaxWidthContainer } from "@/features/page/page";
import { TagsPageClient } from "@/features/tags/tags-page-client";
import { Typography } from "@workspace/ui/components/typography";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tags")({
  component: TagsPage,
});

function TagsPage() {
  return (
    <AccountShell>
      <MaxWidthContainer>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <Typography variant="h1">Tags Management</Typography>
        </div>
        <TagsPageClient />
      </MaxWidthContainer>
    </AccountShell>
  );
}

