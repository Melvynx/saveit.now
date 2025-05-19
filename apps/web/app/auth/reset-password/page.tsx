import { Suspense } from "react";
import { ResetPasswordPage } from "./reset-password-page";

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
