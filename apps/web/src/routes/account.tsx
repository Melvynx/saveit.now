import { DeleteAccountButton } from "@/components/delete-account-button";
import { AccountShell } from "@/features/account/account-shell";
import { AvatarSection } from "@/features/auth/avatar-section";
import { EmailChangeForm } from "@/features/auth/email-change-form";
import { PublicLinkSettings } from "@/features/auth/public-link-settings";
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
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

const getAccountData = createServerFn({ method: "GET" }).handler(async () => {
  const [{ getRequiredUserOrRedirect }, { prisma }] = await Promise.all([
    import("@/lib/auth-session"),
    import("@workspace/database/client"),
  ]);
  const user = await getRequiredUserOrRedirect();
  const publicLinkSettings = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      publicLinkEnabled: true,
      publicLinkSlug: true,
    },
  });

  return {
    user,
    publicLinkSettings,
  };
});

export const Route = createFileRoute("/account")({
  loader: () => getAccountData(),
  component: AccountPage,
});

function AccountPage() {
  const { user, publicLinkSettings } = Route.useLoaderData();
  const location = useLocation();
  const isAccountIndex = location.pathname === "/account";

  return (
    <AccountShell user={user}>
      {isAccountIndex ? (
        <div className="flex flex-col gap-4">
          <AvatarSection user={user} />
          <NameForm defaultName={user.name ?? ""} />
          <EmailChangeForm currentEmail={user.email || ""} />
          <section id="public-link" className="scroll-mt-24">
            <PublicLinkSettings
              initialEnabled={publicLinkSettings?.publicLinkEnabled ?? false}
              initialSlug={publicLinkSettings?.publicLinkSlug ?? null}
            />
          </section>
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
