import { AccountShell } from "@/features/account/account-shell";
import { UpgradePage } from "@/features/upgrade/upgrade-page";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/upgrade")({
  component: UpgradeRoute,
});

function UpgradeRoute() {
  const location = useLocation();

  if (location.pathname !== "/upgrade") {
    return <Outlet />;
  }

  return (
    <AccountShell>
      <UpgradePage />
    </AccountShell>
  );
}
