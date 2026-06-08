import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { BookmarkPage } from "@/features/app/bookmark-page/bookmark-page";

export const Route = createFileRoute("/app/b/$bookmarkId")({
  component: BookmarkRoute,
});

function BookmarkRoute() {
  const { bookmarkId } = Route.useParams();

  return (
    <ClientOnly>
      <BookmarkPage bookmarkId={bookmarkId} />
    </ClientOnly>
  );
}
