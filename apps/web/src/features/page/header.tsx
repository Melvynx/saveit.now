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

export const Header = async () => {
  const user = await getUser();

  return (
    <header className="py-2 border-b">
      <div className="flex items-center gap-2 px-4 max-w-4xl mx-auto">
        <Link href="/app">
          SaveIt<span className="text-orange-500">.now</span>
        </Link>
        <Link href="/app">Bookmarks</Link>
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
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href="/auth/signin"
          >
            SignIn
          </Link>
        )}
      </div>
    </header>
  );
};
