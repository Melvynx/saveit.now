import { PublicBookmarksPage } from "@/features/public-bookmarks/public-bookmarks-page";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

export const Route = createFileRoute("/u/$slug")({
  component: PublicPage,
});

function PublicPage() {
  const { slug } = Route.useParams();
  const result = useQuery(api.bookmarks.queries.getByPublicSlug, {
    slug,
    paginationOpts: { numItems: 1, cursor: null },
  });
  const user = result?.user ? { name: result.user.name } : null;

  if (result === undefined) return null;
  if (!user) {
    return <div>Not found</div>;
  }

  return <PublicBookmarksPage slug={slug} />;
}
