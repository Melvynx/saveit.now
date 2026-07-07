import { PublicLinkSettings } from "@/features/auth/public-link-settings";
import { useSession } from "@/lib/auth-client";
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/account/public-link")({
  component: PublicLinkPage,
});

function PublicLinkPage() {
  const session = useSession();
  const user = session.data?.user as
    | { publicLinkEnabled?: boolean | null; publicLinkSlug?: string | null }
    | undefined;

  if (session.isPending) return null;
  if (!session.data?.user) return <Navigate to="/signin" />;

  return (
    <PublicLinkSettings
      initialEnabled={user?.publicLinkEnabled ?? false}
      initialSlug={user?.publicLinkSlug ?? null}
    />
  );
}
