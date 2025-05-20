import { getUser } from "@/lib/auth-session";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import Link from "next/link";
import { LogoutButton } from "../auth/logout";
import { ModeToggle } from "../dark-mode/mode-toggle";
import { Page } from "./page";

export const Header = async () => {
  const user = await getUser();

  return (
    <header className="border-b py-2">
      <Page className="flex items-center gap-2 px-4">
        <div className="border bg-muted/50 hover:bg-muted/80 transition rounded-sm px-2 py-0.5">
          <Link href="/app">
            SaveIt<span className="text-primary font-bold">.now</span>
          </Link>
        </div>
        <div className="flex-1"></div>
        <ModeToggle />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">{user.name || user.email}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/auth">Account</Link>
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
            href="/auth/signin"
          >
            SignIn
          </Link>
        )}
      </Page>
    </header>
  );
};
