import { PublicBookmarksPage } from "@/features/public-bookmarks/public-bookmarks-page";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getPublicUserData = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { prisma } = await import("@workspace/database/client");
    const user = await prisma.user.findUnique({
      where: {
        publicLinkSlug: data.slug,
        publicLinkEnabled: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return { user };
  });

export const Route = createFileRoute("/u/$slug")({
  loader: ({ params }) => getPublicUserData({ data: params }),
  component: PublicPage,
});

function PublicPage() {
  const { user } = Route.useLoaderData();
  const { slug } = Route.useParams();

  if (!user) {
    return <div>Not found</div>;
  }

  return <PublicBookmarksPage slug={slug} />;
}
