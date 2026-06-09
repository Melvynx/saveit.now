"use client";

import { Dialog } from "@workspace/ui/components/dialog";
import { useLocation, useRouter } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";

type InterceptDialogProps = PropsWithChildren<{
  fallbackTo?: string;
}>;

export const InterceptDialog = ({
  children,
  fallbackTo = "/app",
}: InterceptDialogProps) => {
  const router = useRouter();
  const location = useLocation();

  const closeDialog = () => {
    if (location.maskedLocation) {
      router.history.back();
      return;
    }

    void router.navigate({
      to: fallbackTo as any,
      replace: true,
    });
  };

  return (
    <Dialog defaultOpen onOpenChange={closeDialog}>
      {children}
    </Dialog>
  );
};
