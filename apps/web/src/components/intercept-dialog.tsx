"use client";

import { Dialog } from "@workspace/ui/components/dialog";
import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";

export const InterceptDialog = (props: PropsWithChildren) => {
  const router = useRouter();

  return (
    <Dialog defaultOpen onOpenChange={() => router.back()}>
      {props.children}
    </Dialog>
  );
};
