import { AccountShell } from "@/features/account/account-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
});

function VerifyPage() {
  return (
    <AccountShell>
      <Card>
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
        </CardHeader>
        <CardContent>
          <p>I just sent you an email, click on the link</p>
        </CardContent>
      </Card>
    </AccountShell>
  );
}

