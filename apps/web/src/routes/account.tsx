import { DeleteAccountButton } from "@/components/delete-account-button";
import { AccountShell } from "@/features/account/account-shell";
import { AvatarSection } from "@/features/auth/avatar-section";
import { EmailChangeForm } from "@/features/auth/email-change-form";
import { LoadingButton } from "@/features/form/loading-button";
import { upfetch } from "@/lib/up-fetch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

const getAccountData = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequiredUserOrRedirect } = await import("@/lib/auth-session");
  const user = await getRequiredUserOrRedirect();

  return {
    user,
  };
});

export const Route = createFileRoute("/account")({
  loader: () => getAccountData(),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useLoaderData();
  const location = useLocation();
  const navigate = useNavigate();
  const isAccountIndex = location.pathname === "/account";
  const isPublicLinkHash =
    location.pathname === "/account" &&
    (location.hash === "#public-link" || location.hash === "public-link");

  useEffect(() => {
    const hash = window.location.hash;

    if (hash === "#public-link") {
      void navigate({ to: "/account/public-link", replace: true });
    }
  }, [navigate]);

  return (
    <AccountShell user={user}>
      {isPublicLinkHash ? null : isAccountIndex ? (
        <div className="flex flex-col gap-4">
          <AvatarSection user={user} />
          <NameForm defaultName={user.name ?? ""} />
          <EmailChangeForm currentEmail={user.email || ""} />
          <Card>
            <CardHeader>
              <CardTitle>Delete account</CardTitle>
              <CardDescription>
                Request account deletion. You will confirm the deletion from a
                link sent to your email.
              </CardDescription>
            </CardHeader>
            <DeleteAccountButton />
          </Card>
        </div>
      ) : (
        <Outlet />
      )}
    </AccountShell>
  );
}

function NameForm({ defaultName }: { defaultName: string }) {
  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const name = formData.get("name");
      await upfetch("/api/user/profile", {
        method: "PATCH",
        body: { name: String(name ?? "") },
        schema: z.object({ success: z.boolean() }),
      });
    },
    onSuccess: () => toast.success("Name updated"),
    onError: () => toast.error("Failed to update name"),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(new FormData(event.currentTarget));
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Display name</CardTitle>
          <CardDescription>
            This name appears in your SaveIt.now account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="account-name">Name</Label>
          <Input
            id="account-name"
            type="text"
            name="name"
            placeholder="Name"
            defaultValue={defaultName}
          />
        </CardContent>
        <CardFooter className="flex justify-end border-t">
          <LoadingButton
            loading={mutation.isPending}
            disabled={mutation.isPending}
            size="sm"
            variant="outline"
          >
            Save changes
          </LoadingButton>
        </CardFooter>
      </Card>
    </form>
  );
}
