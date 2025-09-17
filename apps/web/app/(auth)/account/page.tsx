import { EmailChangeForm } from "@/features/auth/email-change-form";
import { AvatarSection } from "@/features/auth/avatar-section";
import { SubmitButton } from "@/features/form/loading-button";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { MaxWidthContainer } from "@/features/page/page";
import { auth } from "@/lib/auth";
import { getUser } from "@/lib/auth-session";
import { EmailChangeSchema } from "@/lib/schemas/email-change.schema";
import { serverToast } from "@/lib/server-toast";
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

  return (
    <MaxWidthContainer className="my-8 flex flex-col gap-6 lg:gap-10">
      <Typography variant="h1">Hello {user?.name || "you"} 👋</Typography>
      {user && <AvatarSection user={user} />}
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
      <EmailChangeForm
        currentEmail={user?.email || ""}
        onEmailChange={async (formData) => {
          "use server";
          const newEmail = formData.get("email") as string;

          try {
            const validatedData = EmailChangeSchema.parse({ newEmail });

            await auth.api.changeEmail({
              headers: await headers(),
              body: {
                newEmail: validatedData.newEmail,
                callbackURL: "/account",
              },
            });

            await serverToast("Check your current email for verification link");
          } catch (error) {
            if (error instanceof Error && "issues" in error) {
              // Zod validation error
              const zodError = error as { issues?: Array<{ message: string }> };
              const firstError = zodError.issues?.[0]?.message;
              await serverToast(
                firstError || "Please enter a valid email address",
              );
            } else {
              await serverToast("Failed to change email. Please try again.");
            }
          }

          revalidatePath("/account");
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Danger</CardTitle>
          <CardDescription>
            Delete your account. After clicking the button, you will need to
            confirm the deletion via a link sent to your email.
          </CardDescription>
        </CardHeader>
        <DeleteAccountButton />
      </Card>
    </MaxWidthContainer>
  );
}
