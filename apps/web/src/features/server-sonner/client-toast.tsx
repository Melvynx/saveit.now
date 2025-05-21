"use client";

// Source : https://buildui.com/posts/toast-messages-in-react-server-components

import { startTransition, useEffect, useOptimistic, useState } from "react";
import { toast as sonnerToast } from "sonner";
import type { ServerToastType } from "./server-toast.schema";

type Toast = {
  id: string;
  dismiss: () => Promise<void>;
} & ServerToastType;

export function ClientToasts({ toasts }: { toasts: Toast[] }) {
  const [optimisticToasts, remove] = useOptimistic(toasts, (current, id) =>
    current.filter((toast) => toast.id !== id),
  );

  const localToasts = optimisticToasts.map((toast) => ({
    ...toast,
    dismiss: async () => {
      remove(toast.id);
      await toast.dismiss();
    },
  }));

  const [sentToSonner, setSentToSonner] = useState<string[]>([]);

  useEffect(() => {
    localToasts
      .filter((toast) => !sentToSonner.includes(toast.id))
      .forEach((toast) => {
        setSentToSonner((prev) => [...prev, toast.id]);
        sonnerToast(toast.message, {
          id: toast.id,
          // @ts-expect-error - Sonner API doesn't include type in TypeScript definition but it's work
          type: toast.type,
          onDismiss: () => startTransition(toast.dismiss),
          onAutoClose: () => startTransition(toast.dismiss),
        });
      });
  }, [localToasts, sentToSonner]);

  return null;
}
