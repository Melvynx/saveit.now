import { SubmitButton } from "@/features/form/loading-button";
import { MaxWidthContainer } from "@/features/page/page";
import { auth } from "@/lib/auth";
import { getUser } from "@/lib/auth-session";
import { serverToast } from "@/lib/server-toast";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Typography } from "@workspace/ui/components/typography";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export default async function AuthPage() {
  const user = await getUser();
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });
  const sessions = await auth.api.listSessions({
    headers: await headers(),
  });

  return (
    <MaxWidthContainer className="my-8 flex flex-col gap-6 lg:gap-10">
      <Typography variant="h1">Hello {user?.name || "you"} 👋</Typography>
      <form
        action={async (formData) => {
          "use server";
          const name = formData.get("name");
          await auth.api.updateUser({
            headers: await headers(),
            body: {
              name: name as string,
            },
          });

          await serverToast("Name updated");

          revalidatePath("/account");
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Name</CardTitle>
            <CardDescription>Display name on the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              name="name"
              placeholder="Name"
              defaultValue={user?.name ?? ""}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <SubmitButton>Update</SubmitButton>
          </CardFooter>
        </Card>
      </form>
      <Card>
        <CardHeader>
          <CardTitle>Danger</CardTitle>
          <CardDescription>
            Delete your account. After clicking the button, you will need to
            confirm the deletion via a link sent to your email.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end">
          <form>
            <Button
              formAction={async () => {
                "use server";

                await auth.api.deleteUser({
                  headers: await headers(),
                  body: {
                    callbackURL: "/goodbye",
                  },
                });
                await serverToast(
                  "Click on the link in your email to delete your account",
                );
              }}
              variant="destructive"
            >
              Delete account
            </Button>
          </form>
        </CardFooter>
      </Card>
    </MaxWidthContainer>
  );
}
