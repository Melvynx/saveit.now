"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation } from "@tanstack/react-query";
import { CardFooter } from "@workspace/ui/components/card";
import { toast } from "sonner";

export function DeleteAccountButton() {
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return unwrapSafePromise(
        authClient.deleteUser({
          callbackURL: "/goodbye",
        }),
      );
    },
    onSuccess: () => {
      toast.success("Click on the link in your email to delete your account");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });

  return (
    <CardFooter className="flex justify-end">
      <LoadingButton
        onClick={() => deleteAccountMutation.mutate()}
        variant="destructive"
        loading={deleteAccountMutation.isPending}
      >
        Delete account
      </LoadingButton>
    </CardFooter>
  );
}
