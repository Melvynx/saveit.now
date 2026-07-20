import { AccountShell } from "@/features/account/account-shell";
import { UpgradePage } from "@/features/upgrade/upgrade-page";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [{ title: "Upgrade to SaveIt Pro | SaveIt.now" }],
  }),
  component: UpgradeRoute,
});

function UpgradeRoute() {
  const location = useLocation();

  if (location.pathname !== "/upgrade") {
    return <Outlet />;
  }

  return (
    <AccountShell
      title="Upgrade to SaveIt Pro"
      description="Choose a billing plan and unlock Pro on every signed-in device."
    >
      <UpgradePage />
    </AccountShell>
  );
}
