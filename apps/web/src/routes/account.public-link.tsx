import { PublicLinkSettings } from "@/features/auth/public-link-settings";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getPublicLinkData = createServerFn({ method: "GET" }).handler(
  async () => {
    const [{ getRequiredUserOrRedirect }, { prisma }] = await Promise.all([
      import("@/lib/auth-session"),
      import("@workspace/database/client"),
    ]);
    const user = await getRequiredUserOrRedirect();
    const publicLinkSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        publicLinkEnabled: true,
        publicLinkSlug: true,
      },
    });

    return { publicLinkSettings };
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
