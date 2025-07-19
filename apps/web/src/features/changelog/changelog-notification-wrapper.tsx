"use client";

import { useSession } from "@/lib/auth";
import { ChangelogNotification } from "./changelog-notification";

export function ChangelogNotificationWrapper() {
  const session = useSession();
  
  if (!session?.user?.id) return null;
  
  return <ChangelogNotification />;
}