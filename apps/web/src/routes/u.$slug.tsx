import { PublicBookmarksPage } from "@/features/public-bookmarks/public-bookmarks-page";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ConvexHttpClient } from "convex/browser";

const convexUrl =
  (import.meta.env?.VITE_CONVEX_URL ?? process.env.VITE_CONVEX_URL) || "";

const getPublicUserData = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const convex = new ConvexHttpClient(convexUrl);
    // getByPublicSlug validates publicLinkEnabled and returns user info.
    let user: { name: string } | null = null;
    try {
      const result = await convex.query(api.bookmarks.queries.getByPublicSlug, {
        slug: data.slug,
        paginationOpts: { numItems: 1, cursor: null },
      });
      if (result?.user) {
        user = { name: result.user.name };
      }
    } catch {
      user = null;
    }
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
