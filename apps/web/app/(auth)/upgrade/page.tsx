"use client";

import { Suspense } from "react";
import { UpgradePage } from "./upgrade-page";

export default function RoutePage() {
  return (
    <Suspense>
      <UpgradePage />
    </Suspense>
  );
}
