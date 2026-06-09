import { PublicLinkSettings } from "@/features/auth/public-link-settings";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getPublicLinkData = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequiredUserOrRedirect } = await import("@/lib/auth-session");
    const user = await getRequiredUserOrRedirect();

    return {
      publicLinkSettings: {
        publicLinkEnabled: user.publicLinkEnabled ?? false,
        publicLinkSlug: user.publicLinkSlug ?? null,
      },
    };
  },
);

export const Route = createFileRoute("/account/public-link")({
  loader: () => getPublicLinkData(),
  component: PublicLinkPage,
});

function PublicLinkPage() {
  const { publicLinkSettings } = Route.useLoaderData();

  return (
    <PublicLinkSettings
      initialEnabled={publicLinkSettings?.publicLinkEnabled ?? false}
      initialSlug={publicLinkSettings?.publicLinkSlug ?? null}
    />
  );
}
