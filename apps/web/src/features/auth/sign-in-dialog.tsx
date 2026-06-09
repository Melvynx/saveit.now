"use client";

import { OtpForm } from "@/components/better-auth-otp";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { SignInWith } from "@/features/auth/sign-in-with";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";
import { useLocation, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SignInDialogSearch = {
  redirectUrl?: string;
  email?: string;
  step?: "email" | "otp";
  modal?: string;
};

const getSafeRedirectUrl = (redirectUrl?: string) => {
  if (!redirectUrl?.startsWith("/") || redirectUrl.startsWith("//")) {
    return "/app";
  }

  return redirectUrl;
};

export function SignInDialog() {
  const [isMounted, setIsMounted] = useState(false);
  const search = useSearch({ strict: false }) as SignInDialogSearch;
  const isOpen = search.modal === "signin";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsMounted(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!isMounted || !isOpen) {
    return null;
  }

  return <MountedSignInDialog search={search} />;
}

function MountedSignInDialog({ search }: { search: SignInDialogSearch }) {
  const router = useRouter();
  const location = useLocation();
  const session = useSession();
  const initialStep = search.step === "otp" && search.email ? "otp" : "email";
  const redirectUrl = getSafeRedirectUrl(search.redirectUrl);

  const closeDialog = () => {
    if (location.maskedLocation) {
      router.history.back();
      return;
    }

    void router.navigate({
      to: ".",
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        email: undefined,
        modal: undefined,
        redirectUrl: undefined,
        step: undefined,
      }),
      replace: true,
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        }
      }}
    >
      <DialogContent className="gap-6 p-0 sm:max-w-md">
        <DialogHeader className="items-center px-6 pt-7 text-center">
          <div className="mb-1 flex items-center gap-2">
            <img
              src="/icon.png"
              alt=""
              className="size-8 rounded-md object-cover"
            />
            <DialogTitle className="text-lg">SaveIt.now</DialogTitle>
          </div>
          <DialogDescription>
            Sign in to open your bookmark workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6">
          <OtpForm
            defaultEmail={search.email}
            initialStep={initialStep}
            variant="split"
            onStepChange={({ email, step }) => {
              void router.navigate({
                to: ".",
                search: (previous: Record<string, unknown>) => ({
                  ...previous,
                  email: step === "otp" ? email : undefined,
                  modal: "signin",
                  redirectUrl,
                  step,
                }),
                replace: true,
              });
            }}
            sendOtp={async (email) => {
              const result = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: "sign-in",
              });
              if (result.error) throw new Error(result.error.message);
            }}
            verifyOtp={async (email, otp) => {
              const result = await authClient.signIn.emailOtp({
                email,
                otp,
              });
              if (result.error) throw new Error(result.error.message);

              return result.data.user;
            }}
            onSuccess={() => {
              router.history.push(redirectUrl);
              session.refetch();
            }}
            onError={(error) => toast.error(error)}
          />

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-2">
            <SignInWith
              className="w-full"
              type="github"
              variant="monochrome"
              callbackURL={redirectUrl}
              buttonProps={{}}
            />
            <SignInWith
              className="w-full"
              type="google"
              variant="monochrome"
              callbackURL={redirectUrl}
              buttonProps={{}}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" size="sm" />}>
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
