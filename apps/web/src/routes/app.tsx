import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { BookmarksPage } from "@/features/app/bookmarks-page";

export const Route = createFileRoute("/app")({
  component: AppRoute,
});

function AppRoute() {
  return (
    <ClientOnly>
      <BookmarksPage />
    </ClientOnly>
  );
}
