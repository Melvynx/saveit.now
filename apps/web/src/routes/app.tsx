import {
  ClientOnly,
  Outlet,
  createFileRoute,
  useLocation,
} from "@tanstack/react-router";
import { BookmarksPage } from "@/features/app/bookmarks-page";

export const Route = createFileRoute("/app")({
  component: AppRoute,
});

function AppRoute() {
  const location = useLocation();
  const isAppIndex = location.pathname === "/app";

  if (!isAppIndex) {
    return <Outlet />;
  }

  return (
    <ClientOnly>
      <BookmarksPage />
    </ClientOnly>
  );
}
