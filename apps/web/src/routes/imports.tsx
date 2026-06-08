import { AccountShell } from "@/features/account/account-shell";
import { ImportForm } from "@/features/imports/import-form";
import { MaxWidthContainer } from "@/features/page/page";
import { Typography } from "@workspace/ui/components/typography";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/imports")({
  component: ImportPage,
});

function ImportPage() {
  return (
    <AccountShell>
      <MaxWidthContainer>
        <Typography className="mb-8" variant="h1">
          Import Bookmarks
        </Typography>
        <ImportForm />
      </MaxWidthContainer>
    </AccountShell>
  );
}

