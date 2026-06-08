import { AccountShell } from "@/features/account/account-shell";
import { UpgradePage } from "@/features/upgrade/upgrade-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/upgrade")({
  component: UpgradeRoute,
});

function UpgradeRoute() {
  return (
    <AccountShell>
      <UpgradePage />
    </AccountShell>
  );
}

