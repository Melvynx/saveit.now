"use client";

import { useSession } from "@/lib/auth-client";
import { ChangelogNotification } from "./changelog-notification";

export function ChangelogNotificationWrapper() {
  const session = useSession();
  
  if (!session.data?.user?.id) return null;
  
  return <ChangelogNotification />;
}