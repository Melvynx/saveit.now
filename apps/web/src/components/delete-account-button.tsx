"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { LoadingButton } from "@/features/form/loading-button";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useAsyncTask } from "@/lib/use-async-task";
import { CardFooter } from "@workspace/ui/components/card";
import { toast } from "sonner";

export function DeleteAccountButton() {
  const deleteAccountTask = useAsyncTask(
    async () =>
      unwrapSafePromise(
        authClient.deleteUser({
          callbackURL: "/goodbye",
        }),
      ),
    {
      onSuccess: () => {
        dialogManager.add({
          title: "Delete account",
          description: "Click on the link in your email to delete your account",
          cancel: {
            label: "Ok",
            onClick: () => {},
          },
        });
      },
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(`Failed to delete account: ${error.message}`);
        }
      },
    },
  );

  return (
    <CardFooter className="flex justify-end border-t">
      <LoadingButton
        onClick={() => void deleteAccountTask.run()}
        variant="destructive"
        loading={deleteAccountTask.isPending}
        disabled={deleteAccountTask.isPending}
        size="sm"
      >
        Delete account
      </LoadingButton>
    </CardFooter>
  );
}
