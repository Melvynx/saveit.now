"use client";

import { authClient } from "@/lib/auth-client";
import { ChangelogNotification } from "./changelog-notification";

export function ChangelogNotificationWrapper() {
  const session = authClient.useSession();
  
  if (!session.data?.user?.id) return null;
  
  return <ChangelogNotification />;
}