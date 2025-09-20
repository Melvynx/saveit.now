/* eslint-disable @next/next/no-img-element */
"use client";

import { APP_LINKS } from "@/lib/app-links";
import { authClient } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation } from "@tanstack/react-query";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { CreditCard, Gem, Key, Shield, User, UserX } from "lucide-react";
import Link from "next/link";
import { useMedia } from "react-use";
import { LogoutButton } from "../auth/logout";

export const HeaderUser = () => {
  const plan = useUserPlan();
  const session = authClient.useSession();
  const isMobile = useMedia("(max-width: 768px)");

  const isImpersonating = session.data?.session.impersonatedBy !== null;
  const isAdmin = session.data?.user.role === "admin";
  const user = session.data?.user;

  const stopImpersonatingMutation = useMutation({
    mutationFn: () => unwrapSafePromise(authClient.admin.stopImpersonating()),
    onSuccess: () => {
      window.location.reload();
    },
  });
  return (
    <>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn({
                "border-primary": plan.name === "pro",
                "border-orange-500 bg-orange-50 dark:bg-orange-950":
                  isImpersonating,
              })}
            >
              {isImpersonating && (
                <UserX className="size-4 text-orange-600 mr-2" />
              )}
              {plan.name === "pro" ? (
                <Gem className="size-4 text-primary" />
              ) : null}
              {isMobile ? (
                user?.image ? (
                  <img
                    src={user.image}
                    alt="Avatar"
                    className="size-4 rounded-full object-cover"
                  />
                ) : (
                  <User className="size-4" />
                )
              ) : (
                <div className="flex items-center gap-2">
                  {user?.image && (
                    <img
                      src={user.image}
                      alt="Avatar"
                      className="size-4 rounded-full object-cover"
                    />
                  )}
                  {user.name || user.email}
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {isImpersonating && (
              <>
                <DropdownMenuItem
                  onClick={() => stopImpersonatingMutation.mutate()}
                  disabled={stopImpersonatingMutation.isPending}
                  className="text-orange-600"
                >
                  <UserX className="size-4 mr-2" />
                  Stop Impersonating
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/account">
                <User className="size-4" />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/keys">
                <Key className="size-4" />
                API Keys
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing">
                <CreditCard className="size-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Shield className="size-4" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="w-full">
              <LogoutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link
          className={buttonVariants({
            size: "sm",
            variant: "outline",
            className: "font-inter",
          })}
          href={APP_LINKS.signin}
        >
          Sign In
        </Link>
      )}
    </>
  );
};

export const HeaderAppNameExtension = () => {
  const plan = useUserPlan();

  if (plan.name === "pro") {
    return ".pro";
  }
  return ".now";
};
