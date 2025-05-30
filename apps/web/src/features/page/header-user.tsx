"use client";

import { APP_LINKS } from "@/lib/app-links";
import { useSession } from "@/lib/auth-client";
import { useUserPlan } from "@/lib/auth/user-plan";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { Gem } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "../auth/logout";

export const HeaderUser = () => {
  const session = useSession();
  const user = session.data?.user;
  const plan = useUserPlan();

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
              })}
            >
              {plan.name === "pro" ? (
                <Gem className="size-4 text-primary" />
              ) : null}
              {user.name || user.email}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href="/account">Account</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing">Billing</Link>
            </DropdownMenuItem>
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
