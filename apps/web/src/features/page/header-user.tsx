import { APP_LINKS } from "@/lib/app-links";
import { authClient } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
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
import { type ComponentProps, useEffect, useState } from "react";
import { LogoutButton } from "../auth/logout";

type HeaderUserMenuContentProps = {
  isAdmin: boolean;
  isImpersonating: boolean;
  isStoppingImpersonation: boolean;
  onStopImpersonating: () => void;
  side?: ComponentProps<typeof DropdownMenuContent>["side"];
  align?: ComponentProps<typeof DropdownMenuContent>["align"];
  className?: string;
};

export function useHeaderUserMenu() {
  const session = authClient.useSession();
  const user = session.data?.user;
  const isImpersonating = session.data?.session.impersonatedBy != null;
  const isAdmin = user?.role === "admin";

  const stopImpersonatingMutation = useMutation({
    mutationFn: () => unwrapSafePromise(authClient.admin.stopImpersonating()),
    onSuccess: () => {
      window.location.reload();
    },
  });

  return {
    user,
    isAdmin,
    isImpersonating,
    isStoppingImpersonation: stopImpersonatingMutation.isPending,
    stopImpersonating: () => stopImpersonatingMutation.mutate(),
  };
}

const useMobileMedia = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMobile;
};

export const HeaderUser = () => {
  const plan = useUserPlan();
  const isMobile = useMobileMedia();
  const {
    user,
    isAdmin,
    isImpersonating,
    isStoppingImpersonation,
    stopImpersonating,
  } = useHeaderUserMenu();

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
          <HeaderUserMenuContent
            isAdmin={isAdmin}
            isImpersonating={isImpersonating}
            isStoppingImpersonation={isStoppingImpersonation}
            onStopImpersonating={stopImpersonating}
          />
        </DropdownMenu>
      ) : (
        <Link
          className={buttonVariants({
            size: "sm",
            variant: "outline",
            className: "font-inter text-foreground",
          })}
          to={APP_LINKS.signin}
        >
          Sign In
        </Link>
      )}
    </>
  );
};

export function HeaderUserMenuContent({
  isAdmin,
  isImpersonating,
  isStoppingImpersonation,
  onStopImpersonating,
  side,
  align,
  className,
}: HeaderUserMenuContentProps) {
  return (
    <DropdownMenuContent
      side={side}
      align={align}
      className={className}
    >
      {isImpersonating && (
        <>
          <DropdownMenuItem
            onClick={onStopImpersonating}
            disabled={isStoppingImpersonation}
            className="text-orange-600"
          >
            <UserX className="mr-2 size-4" />
            Stop Impersonating
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem asChild>
        <a href="/account">
          <User className="size-4" />
          Account
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a href="/account/keys">
          <Key className="size-4" />
          API Keys
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a href="/billing">
          <CreditCard className="size-4" />
          Billing
        </a>
      </DropdownMenuItem>
      {isAdmin && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/admin">
              <Shield className="size-4" />
              Admin Panel
            </a>
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        asChild
        className="w-full"
      >
        <LogoutButton />
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export const HeaderAppNameExtension = () => {
  const plan = useUserPlan();

  if (plan.name === "pro") {
    return ".pro";
  }
  return ".now";
};
