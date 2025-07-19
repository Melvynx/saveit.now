"use client";

import { ChangelogNotificationWrapper } from "@/features/changelog/changelog-notification-wrapper";
import dynamic from "next/dynamic";

// 👇 we'll create this in step 4
const Router = dynamic(() => import("./router").then((res) => res.Router), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <Router />
      <ChangelogNotificationWrapper />
    </>
  );
}
