import { UpgradePage } from "@/features/upgrade/upgrade-page";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade to SaveIt Pro | SaveIt.now" },
      {
        name: "description",
        content:
          "Save up to 50,000 bookmarks, search your library with AI, and unlock unlimited exports with SaveIt Pro.",
      },
    ],
  }),
  component: UpgradeRoute,
});

function UpgradeRoute() {
  const location = useLocation();

  if (location.pathname !== "/upgrade") {
    return <Outlet />;
  }

  return <UpgradePage />;
}
